<?php
declare(strict_types=1);

require_once ROOT_DIR . '/config/database.php';

global $cnx;
if (($_GET['group'] ?? '') === 'players') {
    $action = $_GET['action'] ?? '';
    if ($action === 'list') {
        players_list();
    } elseif ($action === 'search') {
        players_search();
    } elseif ($action === 'trending') {
        players_trending();
    } elseif ($action === 'featured') {
        players_featured();
    } elseif ($action === 'detail') {
        players_detail();
    } elseif ($action === 'image') {
        players_image_proxy();
    } else {
        send_err('Not found', 404);
    }
}

function player_search_normalize(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    if (function_exists('mb_strtolower')) {
        $value = mb_strtolower($value, 'UTF-8');
    } else {
        $value = strtolower($value);
    }

    $value = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $value) ?? '';
    $value = preg_replace('/\s+/u', ' ', trim($value)) ?? '';

    return trim($value);
}

function player_search_terms(string $query): array
{
    $normalized = player_search_normalize($query);
    if ($normalized === '') {
        return [];
    }

    $terms = preg_split('/\s+/u', $normalized) ?: [];
    $terms = array_values(array_unique(array_filter($terms, fn($term) => $term !== '')));

    return array_slice($terms, 0, 8);
}

function player_search_sort_sql(string $sort, bool $hasQuery = false): string
{
    $sort = player_search_normalize($sort);
    $allowed = [
        'best_match' => 'overall DESC, name ASC',
        'overall_desc' => 'overall DESC, name ASC',
        'overall_asc' => 'overall ASC, name ASC',
        'pace_desc' => 'COALESCE(pace, 0) DESC, overall DESC, name ASC',
        'shooting_desc' => 'COALESCE(shooting, 0) DESC, overall DESC, name ASC',
        'passing_desc' => 'COALESCE(passing, 0) DESC, overall DESC, name ASC',
        'dribbling_desc' => 'COALESCE(dribbling, 0) DESC, overall DESC, name ASC',
        'defending_desc' => 'COALESCE(defending, 0) DESC, overall DESC, name ASC',
        'physical_desc' => 'COALESCE(physical, 0) DESC, overall DESC, name ASC',
        'name_asc' => 'name ASC, overall DESC',
    ];

    if ($sort === '' || !isset($allowed[$sort])) {
        $sort = $hasQuery ? 'best_match' : 'overall_desc';
    }

    return $allowed[$sort];
}

function player_search_rank_sql(string $query): array
{
    $normalized = player_search_normalize($query);
    $terms = player_search_terms($query);
    if ($normalized === '' || !$terms) {
        return ['sql' => '0', 'params' => []];
    }

    $name = "LOWER(COALESCE(name, ''))";
    $fullName = "LOWER(COALESCE(full_name, ''))";
    $club = "LOWER(COALESCE(club, ''))";
    $nation = "LOWER(COALESCE(nation, ''))";
    $league = "LOWER(COALESCE(league, ''))";
    $position = "LOWER(COALESCE(position, ''))";
    $altPositions = "LOWER(COALESCE(alt_positions, ''))";

    $prefix = $normalized . '%';
    $contains = '%' . $normalized . '%';

    $parts = [
        "CASE WHEN {$name} = ? OR {$fullName} = ? THEN 600 ELSE 0 END",
        "CASE WHEN {$name} LIKE ? OR {$fullName} LIKE ? THEN 420 ELSE 0 END",
        "CASE WHEN {$club} = ? THEN 260 ELSE 0 END",
        "CASE WHEN {$nation} = ? THEN 220 ELSE 0 END",
        "CASE WHEN {$league} = ? THEN 200 ELSE 0 END",
        "CASE WHEN {$position} = ? OR {$altPositions} LIKE ? THEN 170 ELSE 0 END",
        "CASE WHEN {$name} LIKE ? THEN 90 ELSE 0 END",
        "CASE WHEN {$fullName} LIKE ? THEN 75 ELSE 0 END",
    ];
    $params = [
        $normalized,
        $normalized,
        $prefix,
        $prefix,
        $normalized,
        $normalized,
        $normalized,
        $normalized,
        '%' . $normalized . '%',
        $contains,
        $contains,
    ];

    foreach ($terms as $term) {
        $like = '%' . $term . '%';
        $parts[] = "CASE WHEN {$name} LIKE ? THEN 70 ELSE 0 END";
        $parts[] = "CASE WHEN {$fullName} LIKE ? THEN 58 ELSE 0 END";
        $parts[] = "CASE WHEN {$club} LIKE ? THEN 40 ELSE 0 END";
        $parts[] = "CASE WHEN {$nation} LIKE ? THEN 35 ELSE 0 END";
        $parts[] = "CASE WHEN {$league} LIKE ? THEN 30 ELSE 0 END";
        $parts[] = "CASE WHEN {$position} LIKE ? THEN 28 ELSE 0 END";
        $parts[] = "CASE WHEN {$altPositions} LIKE ? THEN 22 ELSE 0 END";
        array_push($params, $like, $like, $like, $like, $like, $like, $like);
    }

    $parts[] = 'COALESCE(overall, 0) * 0.15';

    return [
        'sql' => implode(' + ', $parts),
        'params' => $params,
    ];
}

function player_search_debug_score(array $player, string $query): int
{
    $normalized = player_search_normalize($query);
    if ($normalized === '') {
        return 0;
    }

    $terms = player_search_terms($query);
    $name = player_search_normalize((string)($player['name'] ?? ''));
    $fullName = player_search_normalize((string)($player['full_name'] ?? ''));
    $club = player_search_normalize((string)($player['club'] ?? ''));
    $nation = player_search_normalize((string)($player['nation'] ?? ''));
    $league = player_search_normalize((string)($player['league'] ?? ''));
    $position = player_search_normalize((string)($player['position'] ?? ''));
    $altPositions = player_search_normalize((string)($player['alt_positions'] ?? ''));

    $score = 0;
    if ($name === $normalized || $fullName === $normalized) {
        $score += 600;
    } elseif (str_starts_with($name, $normalized) || str_starts_with($fullName, $normalized)) {
        $score += 420;
    }

    if ($club === $normalized) $score += 260;
    if ($nation === $normalized) $score += 220;
    if ($league === $normalized) $score += 200;
    if ($position === $normalized || str_contains($altPositions, $normalized)) $score += 170;
    if (str_contains($name, $normalized)) $score += 90;
    if (str_contains($fullName, $normalized)) $score += 75;

    foreach ($terms as $term) {
        if (str_contains($name, $term)) $score += 70;
        if (str_contains($fullName, $term)) $score += 58;
        if (str_contains($club, $term)) $score += 40;
        if (str_contains($nation, $term)) $score += 35;
        if (str_contains($league, $term)) $score += 30;
        if (str_contains($position, $term)) $score += 28;
        if (str_contains($altPositions, $term)) $score += 22;
    }

    $score += (int)round(((float)($player['overall'] ?? 0)) * 0.15);

    return $score;
}

function players_image_proxy(): void {
    $src = safe_str($_GET['src'] ?? $_GET['url'] ?? '');
    if ($src === '' || !preg_match('/^https?:\/\//i', $src)) {
        send_err('Invalid image source', 400);
        return;
    }

    $host = strtolower((string)(parse_url($src, PHP_URL_HOST) ?? ''));
    if ($host === '') {
        send_err('Invalid image source', 400);
        return;
    }

                                                          
    $allowed_hosts = ['cdn.sofifa.net', 'drive.google.com'];
    $allowed_googleusercontent = str_ends_with($host, '.googleusercontent.com');
    if (!in_array($host, $allowed_hosts, true) && !$allowed_googleusercontent) {
        send_err('Image host not allowed', 400);
        return;
    }

    $bytes = false;
    $status_code = 0;
    $content_type = '';

    if (function_exists('curl_init')) {
        $ch = curl_init($src);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'FootyCraftImageProxy/1.0',
            CURLOPT_HTTPHEADER => ['Accept: image/*,*/*;q=0.8'],
        ]);

        $result = curl_exec($ch);
        if ($result !== false) {
            $bytes = $result;
            $status_code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $content_type = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        }
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'timeout' => 10,
                'follow_location' => 1,
                'max_redirects' => 3,
                'header' => "Accept: image/*,*/*;q=0.8\r\nUser-Agent: FootyCraftImageProxy/1.0\r\n",
            ],
        ]);

        $result = @file_get_contents($src, false, $context);
        if ($result !== false) {
            $bytes = $result;
            $status_code = 200;
            if (isset($http_response_header) && is_array($http_response_header)) {
                foreach ($http_response_header as $line) {
                    if (preg_match('/^HTTP\/\S+\s+(\d+)/i', $line, $m)) {
                        $status_code = (int)$m[1];
                    } elseif (stripos($line, 'Content-Type:') === 0) {
                        $content_type = trim(substr($line, 13));
                    }
                }
            }
        }
    }

    if ($bytes === false || $status_code < 200 || $status_code >= 300) {
        send_err('Image fetch failed', 502);
        return;
    }

    $mime = strtolower(trim((string)explode(';', $content_type, 2)[0]));
    $allowed_mime = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/gif',
        'image/svg+xml',
    ];
    if (!in_array($mime, $allowed_mime, true)) {
        $mime = 'image/png';
    }

    header_remove('Content-Type');
    http_response_code(200);
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=86400');
    header('Content-Length: ' . strlen($bytes));
    echo $bytes;
    exit;
}

function players_list(): void {
    global $cnx;
    $page    = max(1, (int)($_GET['page'] ?? 1));
    $limit   = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $pos     = safe_str($_GET['position'] ?? '');
    $nation  = safe_str($_GET['nation'] ?? '');
    $club    = safe_str($_GET['club'] ?? '');
    $league  = safe_str($_GET['league'] ?? '');
    $rarity  = safe_str($_GET['rarity'] ?? '');
    $min_ovr = (int)($_GET['min_overall'] ?? 0);
    $max_ovr = (int)($_GET['max_overall'] ?? 99);
    $offset  = ($page - 1) * $limit;

    $where        = ['overall >= ?', 'overall <= ?'];
    $count_params = [$min_ovr, $max_ovr];

    if ($pos)    { $where[] = 'position = ?';     $count_params[] = $pos; }
    if ($nation) { $where[] = 'nation ILIKE ?';   $count_params[] = $nation; }
    if ($club)   { $where[] = 'club ILIKE ?';     $count_params[] = $club; }
    if ($league) { $where[] = 'league ILIKE ?';   $count_params[] = $league; }
    if ($rarity) { $where[] = 'rarity = ?';       $count_params[] = $rarity; }

    $cond = implode(' AND ', $where);
    $stmt = $cnx->prepare("SELECT COUNT(*) as cnt FROM players WHERE {$cond}");
    $stmt->execute($count_params);
    $total_row = $stmt->fetch();
    $total     = (int)($total_row['cnt'] ?? 0);
    $pages     = max(1, (int)ceil($total / $limit));

    $list_params = array_merge($count_params, [$limit, $offset]);
    $stmt = $cnx->prepare("SELECT * FROM players WHERE {$cond} ORDER BY overall DESC LIMIT ? OFFSET ?");
    $stmt->execute($list_params);
    $rows = $stmt->fetchAll();

    send_ok(['players' => $rows, 'total' => $total, 'pages' => $pages, 'page' => $page, 'limit' => $limit]);
}

function players_search(): void {
    global $cnx;
    $q = safe_str($_GET['q'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(60, (int)($_GET['per_page'] ?? $_GET['limit'] ?? 24)));
    $offset = ($page - 1) * $limit;
    $pos = safe_str($_GET['position'] ?? '');
    $rarity = safe_str($_GET['rarity'] ?? '');
    $league = safe_str($_GET['league'] ?? '');
    $nation = safe_str($_GET['nation'] ?? '');
    $club = safe_str($_GET['club'] ?? '');
    $sort = safe_str($_GET['sort'] ?? '');
    $min_ovr = max(0, min(99, (int)($_GET['min_overall'] ?? 0)));
    $max_ovr = max($min_ovr, min(99, (int)($_GET['max_overall'] ?? 99)));

    $where = [];
    $params = [];
    $terms = player_search_terms($q);
    $searchVector = "LOWER(COALESCE(name, '') || ' ' || COALESCE(full_name, '') || ' ' || COALESCE(club, '') || ' ' || COALESCE(nation, '') || ' ' || COALESCE(league, '') || ' ' || COALESCE(position, '') || ' ' || COALESCE(alt_positions, ''))";

    foreach ($terms as $term) {
        $where[] = "{$searchVector} LIKE ?";
        $params[] = '%' . $term . '%';
    }
    if ($pos) {
        $where[] = '(position = ? OR alt_positions ILIKE ?)';
        $params[] = $pos;
        $params[] = '%' . $pos . '%';
    }
    if ($rarity) {
        $where[] = 'rarity = ?';
        $params[] = $rarity;
    }
    if ($league) {
        $where[] = 'league ILIKE ?';
        $params[] = '%' . $league . '%';
    }
    if ($nation) {
        $where[] = 'nation ILIKE ?';
        $params[] = '%' . $nation . '%';
    }
    if ($club) {
        $where[] = 'club ILIKE ?';
        $params[] = '%' . $club . '%';
    }
    if ($min_ovr > 0) {
        $where[] = 'overall >= ?';
        $params[] = $min_ovr;
    }
    if ($max_ovr < 99) {
        $where[] = 'overall <= ?';
        $params[] = $max_ovr;
    }

    if (empty($where)) {
        send_err('Search query or filters required');
        return;
    }

    $cond = implode(' AND ', $where);
    $stmt = $cnx->prepare("SELECT COUNT(*) as cnt FROM players WHERE {$cond}");
    $stmt->execute($params);
    $total_row = $stmt->fetch();
    $total = (int)($total_row['cnt'] ?? 0);
    $pages = max(1, (int)ceil($total / $limit));

    $columns = 'id, name, full_name, overall, position, alt_positions, rarity, nation, club, league, pace, shooting, passing, dribbling, defending, physical, card_url, image_url';
    $sortSql = player_search_sort_sql($sort, !empty($terms));

    if (!empty($terms)) {
        $rank = player_search_rank_sql($q);
        $query = "SELECT {$columns}, ({$rank['sql']}) AS search_rank
                  FROM players
                  WHERE {$cond}
                  ORDER BY search_rank DESC, {$sortSql}
                  LIMIT ? OFFSET ?";
        $listParams = array_merge($rank['params'], $params, [$limit, $offset]);
    } else {
        $query = "SELECT {$columns}, 0 AS search_rank
                  FROM players
                  WHERE {$cond}
                  ORDER BY {$sortSql}
                  LIMIT ? OFFSET ?";
        $listParams = array_merge($params, [$limit, $offset]);
    }

    $stmt = $cnx->prepare($query);
    $stmt->execute($listParams);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['match_score'] = !empty($terms)
            ? player_search_debug_score((array)$row, $q)
            : 0;
    }
    unset($row);

    send_ok([
        'players' => $rows,
        'total' => $total,
        'pages' => $pages,
        'page' => $page,
        'limit' => $limit,
        'query' => $q,
        'sort' => $sort !== '' ? $sort : (!empty($terms) ? 'best_match' : 'overall_desc'),
    ]);
}

function players_name_key(string $name): string {
    $clean = trim(preg_replace('/\s+/', ' ', $name) ?? '');
    return function_exists('mb_strtolower') ? mb_strtolower($clean, 'UTF-8') : strtolower($clean);
}

function players_blank_metrics(array $player = []): array {
    return [
        'total_pickups' => 0,
        'recent_pickups' => 0,
        'unique_owners' => 0,
        'active_lineups' => 0,
        'lineup_users' => 0,
        'matches_played' => 0,
        'recent_matches' => 0,
        'goals' => 0,
        'recent_goals' => 0,
        'assists' => 0,
        'recent_assists' => 0,
        'avg_rating' => 0.0,
        'avg_shots' => 0.0,
        'avg_xg' => 0.0,
        'avg_passes' => 0.0,
        'avg_accuracy' => 0.0,
        'avg_touches' => 0.0,
        'avg_dribbles' => 0.0,
        'favorite_position' => (string)($player['position'] ?? ''),
        'usage_positions' => [],
        'current_lineup_positions' => [],
        'trending_score' => 0.0,
        'trending_reason' => 'Platform momentum is building around this player.',
        'trending_reason_short' => 'Platform momentum',
        '_rating_total' => 0.0,
        '_rating_count' => 0,
        '_shots_total' => 0.0,
        '_xg_total' => 0.0,
        '_passes_total' => 0.0,
        '_accuracy_total' => 0.0,
        '_touches_total' => 0.0,
        '_dribbles_total' => 0.0,
    ];
}

function players_placeholder_string(int $count): string {
    return implode(',', array_fill(0, $count, '?'));
}

function players_rank_usage_positions(array $usage): array {
    arsort($usage);
    $ranked = [];
    foreach ($usage as $slot => $count) {
        $ranked[] = ['position' => $slot, 'count' => (int)$count];
    }
    return $ranked;
}

function players_resolve_favorite_position(array $metrics, array $player): string {
    $usage = $metrics['usage_positions'] ?? [];
    if ($usage) {
        return (string)array_key_first($usage);
    }
    $current = $metrics['current_lineup_positions'] ?? [];
    if ($current) {
        return (string)array_key_first($current);
    }
    return (string)($player['position'] ?? '');
}

function players_reason_from_metrics(array $player, array $metrics): array {
    $signals = [
        'pickup' => (float)$metrics['recent_pickups'] * 4.5 + (float)$metrics['total_pickups'] * 0.45,
        'lineups' => (float)$metrics['active_lineups'] * 2.2 + (float)$metrics['lineup_users'] * 2.8,
        'matches' => (float)$metrics['recent_matches'] * 2.7 + (float)$metrics['matches_played'] * 0.2,
        'goals' => (float)$metrics['recent_goals'] * 4.8 + (float)$metrics['goals'] * 0.55,
        'assists' => (float)$metrics['recent_assists'] * 4.2 + (float)$metrics['assists'] * 0.45,
        'rating' => max(0.0, ((float)$metrics['avg_rating'] - 6.0) * 3.6),
    ];
    arsort($signals);
    $primary = (string)array_key_first($signals);
    $favoritePosition = $metrics['favorite_position'] ?: (string)($player['position'] ?? '');

    if ($primary === 'goals') {
        return [
            'short' => 'Finishing streak',
            'long' => $metrics['recent_goals'] > 0
                ? "{$player['name']} is trending because the player is finishing chances across the platform with {$metrics['recent_goals']} recent goals and {$metrics['goals']} total."
                : "{$player['name']} is trending because managers keep scoring with the player across the platform.",
        ];
    }

    if ($primary === 'assists') {
        return [
            'short' => 'Chance creation wave',
            'long' => $metrics['recent_assists'] > 0
                ? "{$player['name']} is trending because the player is driving chance creation with {$metrics['recent_assists']} recent assists across user matches."
                : "{$player['name']} is trending because the player keeps creating platform-wide end product.",
        ];
    }

    if ($primary === 'lineups') {
        return [
            'short' => 'Locked into squads',
            'long' => "{$player['name']} is trending because managers keep deploying the player in active lineups, most often as {$favoritePosition}.",
        ];
    }

    if ($primary === 'matches') {
        return [
            'short' => 'Heavy match usage',
            'long' => "{$player['name']} is trending because the player keeps showing up in live matches and is most often trusted in {$favoritePosition}.",
        ];
    }

    if ($primary === 'rating' && (float)$metrics['avg_rating'] > 0) {
        return [
            'short' => 'Strong match ratings',
            'long' => "{$player['name']} is trending because the player is returning a strong average match rating of {$metrics['avg_rating']} across platform matches.",
        ];
    }

    return [
        'short' => 'Squad pickup surge',
        'long' => "{$player['name']} is trending because managers keep adding the player to their clubs and rotating the card into squads.",
    ];
}

function players_finalize_metrics(array $player, array $metrics): array {
    $ratingCount = max(1, (int)$metrics['_rating_count']);
    if ((int)$metrics['_rating_count'] > 0) {
        $metrics['avg_rating'] = round(((float)$metrics['_rating_total']) / $ratingCount, 1);
        $metrics['avg_shots'] = round(((float)$metrics['_shots_total']) / $ratingCount, 1);
        $metrics['avg_xg'] = round(((float)$metrics['_xg_total']) / $ratingCount, 2);
        $metrics['avg_passes'] = round(((float)$metrics['_passes_total']) / $ratingCount, 1);
        $metrics['avg_accuracy'] = round(((float)$metrics['_accuracy_total']) / $ratingCount, 1);
        $metrics['avg_touches'] = round(((float)$metrics['_touches_total']) / $ratingCount, 1);
        $metrics['avg_dribbles'] = round(((float)$metrics['_dribbles_total']) / $ratingCount, 1);
    }

    $metrics['favorite_position'] = players_resolve_favorite_position($metrics, $player);
    $metrics['usage_positions'] = players_rank_usage_positions($metrics['usage_positions']);
    $metrics['current_lineup_positions'] = players_rank_usage_positions($metrics['current_lineup_positions']);

    $metrics['trending_score'] = round(
        ((float)$metrics['recent_pickups'] * 4.5) +
        ((float)$metrics['total_pickups'] * 0.4) +
        ((float)$metrics['active_lineups'] * 2.1) +
        ((float)$metrics['lineup_users'] * 2.8) +
        ((float)$metrics['recent_matches'] * 2.8) +
        ((float)$metrics['matches_played'] * 0.2) +
        ((float)$metrics['recent_goals'] * 4.9) +
        ((float)$metrics['goals'] * 0.5) +
        ((float)$metrics['recent_assists'] * 4.2) +
        ((float)$metrics['assists'] * 0.45) +
        (max(0.0, ((float)$metrics['avg_rating'] - 6.0)) * 3.5),
        1
    );

    $reason = players_reason_from_metrics($player, $metrics);
    $metrics['trending_reason'] = $reason['long'];
    $metrics['trending_reason_short'] = $reason['short'];

    unset(
        $metrics['_rating_total'],
        $metrics['_rating_count'],
        $metrics['_shots_total'],
        $metrics['_xg_total'],
        $metrics['_passes_total'],
        $metrics['_accuracy_total'],
        $metrics['_touches_total'],
        $metrics['_dribbles_total']
    );

    return $metrics;
}

function players_collect_platform_metrics(array $players): array {
    global $cnx;
    if (!$players) return [];

    $playersById = [];
    $ids = [];
    $idsByName = [];
    foreach ($players as $player) {
        $id = (int)($player['id'] ?? 0);
        if ($id <= 0) continue;
        $playersById[$id] = $player;
        $ids[] = $id;
        $nameKey = players_name_key((string)($player['name'] ?? ''));
        if ($nameKey !== '') {
            $idsByName[$nameKey] ??= [];
            $idsByName[$nameKey][] = $id;
        }
    }
    if (!$ids) return [];

    $metrics = [];
    foreach ($playersById as $id => $player) {
        $metrics[$id] = players_blank_metrics($player);
    }

    $placeholder = players_placeholder_string(count($ids));

    $stmt = $cnx->prepare(
        "SELECT player_id,
                COUNT(*) AS total_pickups,
                COUNT(DISTINCT user_id) AS unique_owners,
                SUM(CASE WHEN acquired_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) AS recent_pickups
         FROM user_players
         WHERE player_id IN ({$placeholder})
         GROUP BY player_id"
    );
    $stmt->execute($ids);
    foreach ($stmt->fetchAll() as $row) {
        $id = (int)($row['player_id'] ?? 0);
        if (!isset($metrics[$id])) continue;
        $metrics[$id]['total_pickups'] = (int)($row['total_pickups'] ?? 0);
        $metrics[$id]['unique_owners'] = (int)($row['unique_owners'] ?? 0);
        $metrics[$id]['recent_pickups'] = (int)($row['recent_pickups'] ?? 0);
    }

    $stmt = $cnx->prepare(
        "SELECT ls.player_id, COUNT(*) AS active_lineups, COUNT(DISTINCT l.user_id) AS lineup_users
         FROM lineup_slots ls
         JOIN lineups l ON l.id = ls.lineup_id
         WHERE ls.player_id IN ({$placeholder}) AND ls.player_id IS NOT NULL
         GROUP BY ls.player_id"
    );
    $stmt->execute($ids);
    foreach ($stmt->fetchAll() as $row) {
        $id = (int)($row['player_id'] ?? 0);
        if (!isset($metrics[$id])) continue;
        $metrics[$id]['active_lineups'] = (int)($row['active_lineups'] ?? 0);
        $metrics[$id]['lineup_users'] = (int)($row['lineup_users'] ?? 0);
    }

    $stmt = $cnx->prepare(
        "SELECT ls.player_id, ls.slot_code, COUNT(*) AS slot_count
         FROM lineup_slots ls
         WHERE ls.player_id IN ({$placeholder}) AND ls.player_id IS NOT NULL
         GROUP BY ls.player_id, ls.slot_code"
    );
    $stmt->execute($ids);
    foreach ($stmt->fetchAll() as $row) {
        $id = (int)($row['player_id'] ?? 0);
        $slot = (string)($row['slot_code'] ?? '');
        if (!isset($metrics[$id]) || $slot === '') continue;
        $metrics[$id]['current_lineup_positions'][$slot] = (int)($row['slot_count'] ?? 0);
    }

    $stmt = $cnx->prepare('SELECT stats_json, events_json, created_at FROM matches ORDER BY created_at DESC, id DESC');
    $stmt->execute([]);
    $matches = $stmt->fetchAll();
    $recentThreshold = time() - (7 * 24 * 60 * 60);

    foreach ($matches as $match) {
        $stats = json_decode((string)($match['stats_json'] ?? '{}'), true);
        $events = json_decode((string)($match['events_json'] ?? '[]'), true);
        if (!is_array($stats)) $stats = [];
        if (!is_array($events)) $events = [];

        $createdAt = strtotime((string)($match['created_at'] ?? '')) ?: 0;
        $isRecent = $createdAt >= $recentThreshold;

        foreach (($stats['player_stats'] ?? []) as $playerStat) {
            if (!is_array($playerStat)) continue;
            $matchedIds = [];
            $playerIdFromStat = (int)($playerStat['player_id'] ?? 0);
            if ($playerIdFromStat > 0 && isset($metrics[$playerIdFromStat])) {
                $matchedIds[] = $playerIdFromStat;
            } else {
                $nameKey = players_name_key((string)($playerStat['name'] ?? ''));
                if ($nameKey === '' || empty($idsByName[$nameKey])) continue;
                $matchedIds = $idsByName[$nameKey];
            }
            foreach ($matchedIds as $playerId) {
                if (!isset($metrics[$playerId])) continue;
                $metrics[$playerId]['matches_played']++;
                if ($isRecent) $metrics[$playerId]['recent_matches']++;

                $slot = trim((string)($playerStat['slot_code'] ?? $playerStat['position'] ?? ''));
                if ($slot !== '') {
                    $metrics[$playerId]['usage_positions'][$slot] = ($metrics[$playerId]['usage_positions'][$slot] ?? 0) + 1;
                }

                $rating = (float)($playerStat['rating'] ?? 0);
                if ($rating > 0) {
                    $metrics[$playerId]['_rating_total'] += $rating;
                    $metrics[$playerId]['_rating_count']++;
                }
                $metrics[$playerId]['_shots_total'] += (float)($playerStat['shots'] ?? 0);
                $metrics[$playerId]['_xg_total'] += (float)($playerStat['xg'] ?? 0);
                $metrics[$playerId]['_passes_total'] += (float)($playerStat['passes'] ?? 0);
                $metrics[$playerId]['_accuracy_total'] += (float)($playerStat['accuracy'] ?? 0);
                $metrics[$playerId]['_touches_total'] += (float)($playerStat['touches'] ?? 0);
                $metrics[$playerId]['_dribbles_total'] += (float)($playerStat['dribbles'] ?? 0);

            }
        }

        foreach ($events as $event) {
            if (!is_array($event)) continue;
            if (($event['type'] ?? '') === 'goal') {
                $matchedScorers = [];
                $scorerId = (int)($event['player_id'] ?? 0);
                if ($scorerId > 0 && isset($metrics[$scorerId])) {
                    $matchedScorers[] = $scorerId;
                } else {
                    $scorerKey = players_name_key((string)($event['player'] ?? ''));
                    if ($scorerKey !== '' && !empty($idsByName[$scorerKey])) {
                        $matchedScorers = $idsByName[$scorerKey];
                    }
                }
                foreach ($matchedScorers as $playerId) {
                    $metrics[$playerId]['goals']++;
                    if ($isRecent) $metrics[$playerId]['recent_goals']++;
                }

                $matchedAssists = [];
                $assistId = (int)($event['assist_player_id'] ?? 0);
                if ($assistId > 0 && isset($metrics[$assistId])) {
                    $matchedAssists[] = $assistId;
                } else {
                    $assistKey = players_name_key((string)($event['assist'] ?? ''));
                    if ($assistKey !== '' && !empty($idsByName[$assistKey])) {
                        $matchedAssists = $idsByName[$assistKey];
                    }
                }
                foreach ($matchedAssists as $playerId) {
                    $metrics[$playerId]['assists']++;
                    if ($isRecent) $metrics[$playerId]['recent_assists']++;
                }
            }
        }
    }

    foreach ($metrics as $id => $playerMetrics) {
        $metrics[$id] = players_finalize_metrics($playersById[$id], $playerMetrics);
    }

    return $metrics;
}

function players_attach_platform_metrics(array $players): array {
    if (!$players) return [];
    $metrics = players_collect_platform_metrics($players);
    $enriched = [];
    foreach ($players as $player) {
        $id = (int)($player['id'] ?? 0);
        $platform = $metrics[$id] ?? players_finalize_metrics($player, players_blank_metrics($player));
        $player['platform_metrics'] = $platform;
        $player['pickup_count'] = $platform['recent_pickups'];
        $player['trend_score'] = $platform['trending_score'];
        $player['trend_reason'] = $platform['trending_reason'];
        $player['trend_reason_short'] = $platform['trending_reason_short'];
        $player['favorite_position'] = $platform['favorite_position'];
        $enriched[] = $player;
    }
    usort($enriched, function(array $a, array $b): int {
        $scoreDiff = ((float)($b['trend_score'] ?? 0)) <=> ((float)($a['trend_score'] ?? 0));
        if ($scoreDiff !== 0) return $scoreDiff;
        return ((int)($b['overall'] ?? 0)) <=> ((int)($a['overall'] ?? 0));
    });
    return $enriched;
}

function players_trending_candidates(int $limit = 12): array {
    global $cnx;
    $candidateIds = [];

    $stmt = $cnx->prepare(
        "SELECT player_id
         FROM (
            SELECT player_id,
                   SUM(CASE WHEN acquired_at > NOW() - INTERVAL '7 days' THEN 5 ELSE 1 END) AS pickup_weight
            FROM user_players
            GROUP BY player_id
            ORDER BY pickup_weight DESC, player_id DESC
            LIMIT ?
         ) hot"
    );
    $stmt->execute([$limit]);
    foreach ($stmt->fetchAll() as $row) {
        $playerId = (int)($row['player_id'] ?? 0);
        if ($playerId > 0) $candidateIds[$playerId] = true;
    }

    $stmt = $cnx->prepare(
        "SELECT player_id
         FROM (
            SELECT ls.player_id, COUNT(*) AS lineup_weight
            FROM lineup_slots ls
            WHERE ls.player_id IS NOT NULL
            GROUP BY ls.player_id
            ORDER BY lineup_weight DESC, ls.player_id DESC
            LIMIT ?
         ) active_players"
    );
    $stmt->execute([$limit]);
    foreach ($stmt->fetchAll() as $row) {
        $playerId = (int)($row['player_id'] ?? 0);
        if ($playerId > 0) $candidateIds[$playerId] = true;
    }

    if (!$candidateIds) {
        $stmt = $cnx->prepare('SELECT * FROM players ORDER BY overall DESC LIMIT ?');
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    $ids = array_slice(array_map('intval', array_keys($candidateIds)), 0, max($limit * 2, $limit));
    $placeholder = players_placeholder_string(count($ids));
    $stmt = $cnx->prepare("SELECT * FROM players WHERE id IN ({$placeholder})");
    $stmt->execute($ids);
    $rows = $stmt->fetchAll();
    if ($rows) return $rows;

    $stmt = $cnx->prepare('SELECT * FROM players ORDER BY overall DESC LIMIT ?');
    $stmt->execute([$limit]);
    return $stmt->fetchAll();
}

function players_trending(): void {
    $rows = players_trending_candidates(12);
    $rows = players_attach_platform_metrics($rows);
    send_ok([
        'players' => array_slice($rows, 0, 10),
        'updated_at' => gmdate('c'),
    ]);
}

function players_featured(): void {
    global $cnx;
    $stmt = $cnx->prepare('SELECT * FROM players WHERE rarity IN (\'icon\',\'legend\') ORDER BY RANDOM() LIMIT 8');
    $stmt->execute([]);
    $rows = $stmt->fetchAll();
    if (!$rows) {
        $stmt = $cnx->prepare('SELECT * FROM players ORDER BY RANDOM() LIMIT 8');
        $stmt->execute([]);
        $rows = $stmt->fetchAll();
    }
    $player = $rows[array_rand($rows)];
    send_ok(['player' => $player]);
}

function players_detail(): void {
    global $cnx;
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) send_err('Player ID required');

    $stmt = $cnx->prepare('SELECT * FROM players WHERE id=? LIMIT 1');
    $stmt->execute([$id]);
    $player = $stmt->fetch();
    if (!$player) send_err('Player not found', 404);

    $platform = players_collect_platform_metrics([$player]);
    $metrics = $platform[$id] ?? players_finalize_metrics($player, players_blank_metrics($player));

    send_ok([
        'player' => array_merge($player, [
            'platform_metrics' => $metrics,
            'pickup_count' => $metrics['recent_pickups'],
            'trend_score' => $metrics['trending_score'],
            'trend_reason' => $metrics['trending_reason'],
            'trend_reason_short' => $metrics['trending_reason_short'],
            'favorite_position' => $metrics['favorite_position'],
        ]),
    ]);
}
