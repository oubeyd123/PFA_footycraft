<?php
declare(strict_types=1);

require_once ROOT_DIR . '/config/database.php';
global $cnx;
$method = $_SERVER['REQUEST_METHOD'];

                
$uri_raw = strtok($_SERVER['REQUEST_URI'], '?');
$path = ltrim(substr($uri_raw, strlen(API_PREFIX . '/community')), '/');
$parts = $path !== '' ? explode('/', $path) : [];
$sub_group  = $parts[0] ?? '';
$id         = isset($parts[1]) && $parts[1] !== '' ? (int) $parts[1] : null;
$sub_action = $parts[2] ?? '';

           
if ($sub_group === 'posts') {
    if ($method === 'GET') {
        if ($id === null) {
            list_posts();
        } else {
            get_post($id);
        }
    } elseif ($method === 'POST') {
        if ($sub_action === 'like') {
            like_post($id);
        } elseif ($sub_action === 'comments') {
            add_comment($id);
        } else {
            create_post();
        }
    } elseif ($method === 'PUT') {
        update_post($id);
    } elseif ($method === 'DELETE') {
        delete_post($id);
    } else {
        send_err('Method not allowed', 405);
    }
} elseif ($sub_group === 'comments') {
    if ($method === 'POST' && $sub_action === 'like') {
        like_comment($id);
    } elseif ($method === 'PUT') {
        update_comment($id);
    } elseif ($method === 'DELETE') {
        delete_comment($id);
    } else {
        send_err('Method not allowed', 405);
    }
} elseif ($sub_group === 'users') {
    if ($method === 'GET') {
        search_users();
    } else {
        send_err('Method not allowed', 405);
    }
} elseif ($sub_group === 'reports') {
    if ($method === 'POST') {
        submit_report();
    } else {
        send_err('Method not allowed', 405);
    }
} else {
    send_err('Not found', 404);
}

function decode_lineup_snapshot($raw): ?array
{
    if (!is_string($raw) || trim($raw) === '') {
        return null;
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : null;
}

function hydrate_post_lineup(array &$post): void
{
    $post['lineup_id'] = isset($post['lineup_id']) ? (int) $post['lineup_id'] : 0;
    $post['lineup_name'] = safe_str($post['lineup_name'] ?? '');
    $post['lineup_formation'] = safe_str($post['lineup_formation'] ?? '');
    $post['lineup_snapshot'] = decode_lineup_snapshot($post['lineup_snapshot'] ?? null);
}

function fetch_lineup_snapshot(PDO $cnx, int $lineupId, int $userId): ?array
{
    $lineup = getRow(
        $cnx,
        'SELECT id, name, formation FROM lineups WHERE id = ? AND user_id = ? LIMIT 1',
        [$lineupId, $userId]
    );

    if (!$lineup) {
        return null;
    }

    $slots = getRows(
        $cnx,
        'SELECT ls.slot_code, ls.position_required, p.id as player_id, p.name, p.overall,
                p.position, p.nation, p.league, p.club,
                p.pace, p.shooting, p.passing, p.dribbling, p.defending, p.physical,
                p.rarity, p.card_type, p.card_url, p.image_url
         FROM lineup_slots ls LEFT JOIN players p ON p.id = ls.player_id
         WHERE ls.lineup_id = ? ORDER BY ls.id',
        [$lineupId]
    );

    return [
        'id' => (int) ($lineup['id'] ?? 0),
        'name' => safe_str($lineup['name'] ?? ''),
        'formation' => safe_str($lineup['formation'] ?? ''),
        'slots' => is_array($slots) ? $slots : [],
    ];
}

function list_posts(): void
{
    global $cnx;
    $user = current_user();
    $myId = $user ? (int) $user['id'] : 0;

    $category = normalize_community_category(safe_str($_GET['category'] ?? ''));
    $category = $category === '' ? null : $category;

    try {
                                    
        if ($category) {
            $posts = getRows(
                $cnx,
                "SELECT p.id, p.content, p.image_url, p.category, p.created_at, p.updated_at, p.user_id,
                        p.likes_count as likes, p.lineup_id, p.lineup_name, p.lineup_formation, p.lineup_snapshot,
                    u.username
                 FROM community_posts p
                 JOIN users u ON u.id = p.user_id
                 WHERE p.category = ?
                 ORDER BY p.created_at DESC
                 LIMIT 20",
                [$category]
            );
        } else {
            $posts = getRows(
                $cnx,
                "SELECT p.id, p.content, p.image_url, p.category, p.created_at, p.updated_at, p.user_id,
                        p.likes_count as likes, p.lineup_id, p.lineup_name, p.lineup_formation, p.lineup_snapshot,
                    u.username
                 FROM community_posts p
                 JOIN users u ON u.id = p.user_id
                 ORDER BY p.created_at DESC
                 LIMIT 20"
            );
        }

                                             
        foreach ($posts as &$post) {
            $postId = (int) $post['id'];
            hydrate_post_lineup($post);
            
                                
            $commentCount = getRow($cnx, "SELECT COUNT(*) as count FROM community_comments WHERE post_id = ?", [$postId]);
            $post['comment_count'] = (int) ($commentCount['count'] ?? 0);
            
                                            
            $liked = getRow($cnx, "SELECT COUNT(*) as count FROM community_likes WHERE post_id = ? AND user_id = ?", [$postId, $myId]);
            $post['liked_by_me'] = ((int) ($liked['count'] ?? 0)) > 0;
            
                                        
            $post['comments'] = list_comments($postId, $myId);
        }

                                  
        $topContributors = getRows(
            $cnx,
            "SELECT u.id, u.username, COUNT(p.id) as rep
             FROM users u
             LEFT JOIN community_posts p ON p.user_id = u.id
             WHERE u.role != 'admin' OR u.role IS NULL
             GROUP BY u.id, u.username
             ORDER BY rep DESC
             LIMIT 4"
        );

        send_ok(['posts' => $posts, 'top_contributors' => $topContributors]);
    } catch (Exception $e) {
        send_err('Database error: ' . $e->getMessage(), 500);
    }
}

function list_comments(int $postId, int $myId): array
{
    global $cnx;

    $comments = getRows(
        $cnx,
        "SELECT c.*,
            u.username,
            (SELECT COUNT(*) FROM community_likes WHERE comment_id = c.id) as likes,
            (SELECT COUNT(*) FROM community_likes WHERE comment_id = c.id AND user_id = ?) as liked_by_me
         FROM community_comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC
         LIMIT 5",
        [$myId, $postId]
    );

    foreach ($comments as &$c) {
        $c['likes'] = (int) ($c['likes'] ?? 0);
        $c['liked_by_me'] = ((int) ($c['liked_by_me'] ?? 0)) > 0;
    }

    return $comments;
}

function get_post(int $id): void
{
    global $cnx;
    $user = current_user();
    $myId = $user ? (int) $user['id'] : 0;

    $post = getRow(
        $cnx,
        "SELECT p.*,
            u.username,
            (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id) as comment_count,
            (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id) as likes,
            (SELECT COUNT(*) FROM community_likes WHERE post_id = p.id AND user_id = ?) as liked_by_me
         FROM community_posts p
         JOIN users u ON u.id = p.user_id
         WHERE p.id = ?
         LIMIT 1",
        [$myId, $id]
    );

    if (!$post) {
        send_err('Not found', 404);
    }

    hydrate_post_lineup($post);
    $post['comments'] = list_comments($id, $myId);
    $post['comment_count'] = (int) ($post['comment_count'] ?? 0);
    $post['likes'] = (int) ($post['likes'] ?? 0);
    $post['liked_by_me'] = ((int) ($post['liked_by_me'] ?? 0)) > 0;

    send_ok(['post' => $post]);
}

function create_post(): void
{
    global $cnx;
    $user = require_auth();
    
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    
    $content = safe_str($_POST['content'] ?? ($input['content'] ?? ''));
    $imageUrl = safe_str($_POST['image_url'] ?? ($_POST['image_data'] ?? ($input['image_url'] ?? ($input['image_data'] ?? ''))));
    $category = normalize_community_category(safe_str($_POST['category'] ?? ($input['category'] ?? 'general')));
    $lineupId = (int)($_POST['lineup_id'] ?? ($input['lineup_id'] ?? 0));
    $lineupName = '';
    $lineupFormation = '';
    $lineupSnapshot = null;

    if ($content === "") {
        send_err('Content is required');
    }

    if ($lineupId > 0) {
        $snapshot = fetch_lineup_snapshot($cnx, $lineupId, (int) $user['id']);
        if (!$snapshot) {
            send_err('Selected formation was not found', 422);
        }
        $lineupName = safe_str($snapshot['name'] ?? '');
        $lineupFormation = safe_str($snapshot['formation'] ?? '');
        $lineupSnapshot = json_encode(
            $snapshot,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
        );
    }

    $det = moderation_detect_text($content);
    if ((bool) ($det['violation'] ?? false)) {
        $strike = moderation_apply_violation(
            $cnx,
            (int) $user['id'],
            (string) ($det['reason'] ?? 'policy violation'),
            (string) ($det['severity'] ?? 'yellow')
        );
        if ((bool) ($strike['red_card'] ?? false)) {
            send_err('🔴 RED CARD: Your account has been banned for ' . ($strike['reason'] ?? 'policy violation'), 403);
        }
        $yellowCount = (int) ($strike['yellow_count'] ?? 0);
        $message = '🟡 YELLOW CARD: ' . ($strike['reason'] ?? 'policy violation') . ' (' . $yellowCount . '/3). Receive 3 yellow cards to get banned.';
        send_err($message, 403);
    }

    execute(
        $cnx,
        'INSERT INTO community_posts (user_id, content, image_url, category, lineup_id, lineup_name, lineup_formation, lineup_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [(int) $user['id'], $content, $imageUrl !== '' ? $imageUrl : null, $category, $lineupId > 0 ? $lineupId : null, $lineupName, $lineupFormation, $lineupSnapshot]
    );

    preg_match_all('/@([a-zA-Z0-9_]{3,20})/', $content, $matches);
    $mentions = array_unique($matches[1]);
    foreach($mentions as $m_username) {
        $m_user = getRow($cnx, "SELECT id FROM users WHERE username = ?", [$m_username]);
        if ($m_user && (int)$m_user['id'] !== (int)$user['id']) {
            create_notification(
                $cnx,
                (int)$m_user['id'],
                'mention',
                "{$user['username']} mentioned you in a post.",
                '#community',
                'community'
            );
        }
    }

    send_ok(['message' => 'Post created']);
}

function update_post(?int $id): void
{
    if (!$id) {
        send_err('Missing post id');
    }

    global $cnx;
    $user = require_auth();
    
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $content = safe_str($_POST['content'] ?? ($input['content'] ?? ''));

    if ($content === '') {
        send_err('Content is required');
    }

    $det = moderation_detect_text($content);
    if ((bool) ($det['violation'] ?? false)) {
        $strike = moderation_apply_violation(
            $cnx,
            (int) $user['id'],
            (string) ($det['reason'] ?? 'policy violation'),
            (string) ($det['severity'] ?? 'yellow')
        );
        if ((bool) ($strike['red_card'] ?? false)) {
            send_err('🔴 RED CARD: Your account has been banned for ' . ($strike['reason'] ?? 'policy violation'), 403);
        }
        $yellowCount = (int) ($strike['yellow_count'] ?? 0);
        $message = '🟡 YELLOW CARD: ' . ($strike['reason'] ?? 'policy violation') . ' (' . $yellowCount . '/3). Receive 3 yellow cards to get banned.';
        send_err($message, 403);
    }

    $affected = execute(
        $cnx,
        'UPDATE community_posts SET content = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [$content, $id, (int) $user['id']]
    );

    if ($affected === 0) {
        send_err('Not found or unauthorized', 404);
    }

    send_ok(['message' => 'Post updated']);
}

function delete_post(?int $id): void
{
    if (!$id) {
        send_err('Missing post id');
    }

    global $cnx;
    $user = require_auth();

    $affected = execute($cnx, 'DELETE FROM community_posts WHERE id = ? AND user_id = ?', [$id, (int) $user['id']]);
    if ($affected === 0) {
        send_err('Not found or unauthorized', 404);
    }

    send_ok(['message' => 'Post deleted']);
}

function like_post(?int $id): void
{
    if (!$id) {
        send_err('Missing post id');
    }

    global $cnx;
    $user = require_auth();

    $exists = getRow(
        $cnx,
        'SELECT id FROM community_likes WHERE user_id = ? AND post_id = ?',
        [(int) $user['id'], $id]
    );

    if ($exists) {
        execute($cnx, 'DELETE FROM community_likes WHERE user_id = ? AND post_id = ?', [(int) $user['id'], $id]);
        $liked = false;
    } else {
        execute($cnx, 'INSERT INTO community_likes (user_id, post_id) VALUES (?, ?)', [(int) $user['id'], $id]);
        $liked = true;
        
        $postRow = getRow($cnx, 'SELECT user_id FROM community_posts WHERE id = ?', [$id]);
        if ($postRow && (int)$postRow['user_id'] !== (int)$user['id']) {
            create_notification(
                $cnx,
                (int)$postRow['user_id'],
                'reaction',
                "{$user['username']} liked your post.",
                '#community',
                'community'
            );
        }
    }

    $row = getRow($cnx, 'SELECT COUNT(*) as cnt FROM community_likes WHERE post_id = ?', [$id]);
    $likes = (int) ($row['cnt'] ?? 0);
    execute($cnx, 'UPDATE community_posts SET likes_count = ? WHERE id = ?', [$likes, $id]);

    send_ok(['liked' => $liked, 'likes' => $likes]);
}

function add_comment(?int $postId): void
{
    if (!$postId) {
        send_err('Missing post id');
    }

    global $cnx;
    $user = require_auth();
    
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $content = safe_str($_POST['content'] ?? ($input['content'] ?? ''));

    if ($content === '') {
        send_err('Content is required');
    }

    $det = moderation_detect_text($content);
    if ((bool) ($det['violation'] ?? false)) {
        $strike = moderation_apply_violation(
            $cnx,
            (int) $user['id'],
            (string) ($det['reason'] ?? 'policy violation'),
            (string) ($det['severity'] ?? 'yellow')
        );
        if ((bool) ($strike['red_card'] ?? false)) {
            send_err('🔴 RED CARD: Your account has been banned for ' . ($strike['reason'] ?? 'policy violation'), 403);
        }
        $yellowCount = (int) ($strike['yellow_count'] ?? 0);
        $message = '🟡 YELLOW CARD: ' . ($strike['reason'] ?? 'policy violation') . ' (' . $yellowCount . '/3). Receive 3 yellow cards to get banned.';
        send_err($message, 403);
    }

    $raw_parent_id = $_POST['parent_id'] ?? ($input['parent_id'] ?? null);
    $parent_id = ($raw_parent_id !== null && $raw_parent_id !== '') ? (int)$raw_parent_id : null;

    execute(
        $cnx,
        'INSERT INTO community_comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
        [$postId, (int) $user['id'], $content, $parent_id]
    );

    preg_match_all('/@([a-zA-Z0-9_]{3,20})/', $content, $matches);
    $mentions = array_unique($matches[1]);
    foreach($mentions as $m_username) {
        $m_user = getRow($cnx, "SELECT id FROM users WHERE username = ?", [$m_username]);
        if ($m_user && (int)$m_user['id'] !== (int)$user['id']) {
            create_notification(
                $cnx,
                (int)$m_user['id'],
                'mention',
                "{$user['username']} mentioned you in a comment.",
                '#community',
                'community'
            );
        }
    }

    if ($parent_id) {
        $pRow = getRow($cnx, "SELECT user_id FROM community_comments WHERE id = ?", [$parent_id]);
        if ($pRow && (int)$pRow['user_id'] !== (int)$user['id']) {
            $pUsernameRow = getRow($cnx, "SELECT username FROM users WHERE id = ?", [(int)$pRow['user_id']]);
            $p_username = $pUsernameRow ? $pUsernameRow['username'] : '';
            if (!in_array($p_username, $mentions)) {
                create_notification(
                    $cnx,
                    (int)$pRow['user_id'],
                    'reaction',
                    "{$user['username']} replied to your comment.",
                    '#community',
                    'community'
                );
            }
        }
    } else {
        $postRow = getRow($cnx, 'SELECT user_id FROM community_posts WHERE id = ?', [$postId]);
        if ($postRow && (int)$postRow['user_id'] !== (int)$user['id']) {
            $postUserRow = getRow($cnx, "SELECT username FROM users WHERE id = ?", [(int)$postRow['user_id']]);
            $postUsername = $postUserRow ? $postUserRow['username'] : '';
            if (!in_array($postUsername, $mentions)) {
                create_notification(
                    $cnx,
                    (int)$postRow['user_id'],
                    'reaction',
                    "{$user['username']} commented on your post.",
                    '#community',
                    'community'
                );
            }
        }
    }

    $row = getRow($cnx, 'SELECT COUNT(*) as cnt FROM community_comments WHERE post_id = ?', [$postId]);
    $count = (int) ($row['cnt'] ?? 0);
    execute($cnx, 'UPDATE community_posts SET comment_count = ? WHERE id = ?', [$count, $postId]);

    send_ok(['message' => 'Comment added']);
}

function like_comment(?int $id): void
{
    if (!$id) {
        send_err('Missing comment id');
    }

    global $cnx;
    $user = require_auth();

    $exists = getRow(
        $cnx,
        'SELECT id FROM community_likes WHERE user_id = ? AND comment_id = ?',
        [(int) $user['id'], $id]
    );

    if ($exists) {
        execute($cnx, 'DELETE FROM community_likes WHERE user_id = ? AND comment_id = ?', [(int) $user['id'], $id]);
        $liked = false;
    } else {
        execute($cnx, 'INSERT INTO community_likes (user_id, comment_id) VALUES (?, ?)', [(int) $user['id'], $id]);
        $liked = true;

        $cmtRow = getRow($cnx, 'SELECT user_id FROM community_comments WHERE id = ?', [$id]);
        if ($cmtRow && (int)$cmtRow['user_id'] !== (int)$user['id']) {
            create_notification(
                $cnx,
                (int)$cmtRow['user_id'],
                'reaction',
                "{$user['username']} liked your comment.",
                '#community',
                'community'
            );
        }
    }

    $row = getRow($cnx, 'SELECT COUNT(*) as cnt FROM community_likes WHERE comment_id = ?', [$id]);
    $likes = (int) ($row['cnt'] ?? 0);
    execute($cnx, 'UPDATE community_comments SET likes_count = ? WHERE id = ?', [$likes, $id]);

    send_ok(['liked' => $liked, 'likes' => $likes]);
}

function update_comment(?int $id): void
{
    if (!$id) {
        send_err('Missing comment id');
    }

    global $cnx;
    $user = require_auth();
    
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $content = safe_str($_POST['content'] ?? ($input['content'] ?? ''));

    if ($content === '') {
        send_err('Content is required');
    }

    $det = moderation_detect_text($content);
    if ((bool) ($det['violation'] ?? false)) {
        $strike = moderation_apply_violation(
            $cnx,
            (int) $user['id'],
            (string) ($det['reason'] ?? 'policy violation'),
            (string) ($det['severity'] ?? 'yellow')
        );
        if ((bool) ($strike['red_card'] ?? false)) {
            send_err('🔴 RED CARD: Your account has been banned for ' . ($strike['reason'] ?? 'policy violation'), 403);
        }
        $yellowCount = (int) ($strike['yellow_count'] ?? 0);
        $message = '🟡 YELLOW CARD: ' . ($strike['reason'] ?? 'policy violation') . ' (' . $yellowCount . '/3). Receive 3 yellow cards to get banned.';
        send_err($message, 403);
    }

    $affected = execute(
        $cnx,
        'UPDATE community_comments SET content = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [$content, $id, (int) $user['id']]
    );

    if ($affected === 0) {
        send_err('Not found or unauthorized', 404);
    }

    send_ok(['message' => 'Comment updated']);
}

function delete_comment(?int $id): void
{
    if (!$id) {
        send_err('Missing comment id');
    }

    global $cnx;
    $user = require_auth();
    $affected = execute($cnx, 'DELETE FROM community_comments WHERE id = ? AND user_id = ?', [$id, (int) $user['id']]);

    if ($affected === 0) {
        send_err('Not found or unauthorized', 404);
    }

    send_ok(['message' => 'Comment deleted']);
}

function normalize_community_category(string $category): string
{
    $normalized = strtolower(trim($category));

    return match ($normalized) {
        'tactics' => 'tactics',
        'squad_showcases', 'squad showcases', 'showcase', 'showcases' => 'squad_showcases',
        'announcement' => 'announcement',
        'general', 'discussion' => 'general',
        default => $normalized === '' ? '' : 'general',
    };
}

function search_users(): void
{
    global $cnx;
    $q = safe_str($_GET['q'] ?? '');
    
    if (strlen($q) < 1) {
        send_ok(['users' => []]);
        return;
    }

    $users = getRows(
        $cnx,
        "SELECT username FROM users WHERE username ILIKE ? LIMIT 10",
        ["%$q%"]
    );

    send_ok(['users' => array_column($users, 'username')]);
}

function submit_report(): void
{
    global $cnx;
    $user = require_auth();

    $input = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?: []);
    $target_type = trim($input['target_type'] ?? '');
    $target_id   = (int) ($input['target_id'] ?? 0);
    $category    = trim($input['category'] ?? '');
    $description = trim((string)($input['description'] ?? ''));

    $allowed_types = ['post', 'comment'];
    $allowed_cats  = [
        'Spam', 'Nudity or sexual activity', 'Hate speech or symbols',
        'Violence or dangerous organizations', 'Bullying or harassment',
        'Scam or fraud', 'False information',
    ];

    if (!in_array($target_type, $allowed_types, true) || $target_id <= 0 || !in_array($category, $allowed_cats, true)) {
        send_err('Invalid report data', 422);
    }

    if ($target_type === 'post') {
        $targetExists = getRow($cnx, 'SELECT id FROM community_posts WHERE id = ?', [$target_id]);
        if (!$targetExists) {
            send_err('Post not found', 404);
        }
    } else {
        $targetExists = getRow($cnx, 'SELECT id FROM community_comments WHERE id = ?', [$target_id]);
        if (!$targetExists) {
            send_err('Comment not found', 404);
        }
    }

    $existing = getRow(
        $cnx,
        'SELECT id FROM community_reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = ?',
        [(int) $user['id'], $target_type, $target_id, 'open']
    );
    if ($existing) {
        send_err('You have already reported this content', 409);
    }

    execute(
        $cnx,
        'INSERT INTO community_reports (reporter_id, target_type, target_id, category, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [(int) $user['id'], $target_type, $target_id, $category, $description, 'open']
    );

    send_ok(['message' => 'Report submitted']);
}
