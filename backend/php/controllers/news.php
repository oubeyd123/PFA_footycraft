<?php
declare(strict_types=1);

require_once ROOT_DIR . '/config/database.php';

global $cnx;

if (($_GET['group'] ?? '') === 'news') {
    $action = $_GET['action'] ?? '';
    if ($action === 'search') {
        news_search();
    } elseif ($action === 'list') {
        news_list();
    } elseif ($action === 'detail') {
        news_detail();
    } else {
        send_err('Not found', 404);
    }
}

function news_stopwords(): array
{
    return [
        'a' => true, 'an' => true, 'and' => true, 'are' => true, 'as' => true, 'at' => true,
        'be' => true, 'but' => true, 'by' => true, 'for' => true, 'from' => true, 'has' => true,
        'have' => true, 'in' => true, 'into' => true, 'is' => true, 'it' => true, 'its' => true,
        'of' => true, 'on' => true, 'or' => true, 'that' => true, 'the' => true, 'their' => true,
        'this' => true, 'to' => true, 'was' => true, 'will' => true, 'with' => true, 'after' => true,
        'before' => true, 'than' => true, 'then' => true, 'them' => true, 'they' => true, 'you' => true,
        'your' => true, 'our' => true, 'about' => true, 'over' => true, 'under' => true, 'more' => true,
        'most' => true, 'latest' => true, 'news' => true, 'football' => true,
    ];
}

function news_normalize_text(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if (is_string($transliterated) && $transliterated !== '') {
        $value = $transliterated;
    }

    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9\s]+/', ' ', $value) ?? $value;
    $value = preg_replace('/\s+/', ' ', $value) ?? $value;
    return trim($value);
}

function news_repair_text(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    if (!preg_match('/[\x{00C2}\x{00C3}\x{00E2}\x{20AC}]/u', $value)) {
        return $value;
    }

    $converted = @iconv('WINDOWS-1252', 'UTF-8//IGNORE', $value);
    if (is_string($converted) && $converted !== '') {
        return $converted;
    }

    $replacements = [
        "\u{00E2}\u{20AC}\u{2122}" => "'",
        "\u{00E2}\u{20AC}\u{02DC}" => "'",
        "\u{00E2}\u{20AC}\u{0153}" => '"',
        "\u{00E2}\u{20AC}\u{009D}" => '"',
        "\u{00E2}\u{20AC}\u{201C}" => '-',
        "\u{00E2}\u{20AC}\u{201D}" => '-',
        "\u{00C2}\u{00A3}" => "\u{00A3}",
        "\u{00C2}\u{20AC}" => "\u{20AC}",
        "\u{00C2}" => '',
    ];

    return strtr($value, $replacements);
}

function news_tokenize(string $value): array
{
    $normalized = news_normalize_text($value);
    if ($normalized === '') {
        return [];
    }

    $stopwords = news_stopwords();
    $tokens = [];
    foreach (explode(' ', $normalized) as $token) {
        $token = trim($token);
        if ($token === '' || strlen($token) < 2 || strlen($token) > 64) {
            continue;
        }
        if (isset($stopwords[$token])) {
            continue;
        }
        $tokens[$token] = true;
    }

    return array_keys($tokens);
}

function news_article_display_image(array $article): string
{
    $image = trim((string)($article['image_url'] ?? ''));
    if ($image !== '') {
        return $image;
    }

    $fallback = trim((string)($article['fallback_image_url'] ?? ''));
    if ($fallback !== '') {
        return $fallback;
    }

    return '/frontend/assets/images/ui/news.png';
}

function news_extract_excerpt(array $article): string
{
    $excerpt = news_repair_text((string)($article['excerpt'] ?? ''));
    if ($excerpt !== '') {
        return $excerpt;
    }

    $content = news_repair_text((string)($article['content'] ?? ''));
    if ($content === '') {
        return 'No description available.';
    }

    $content = preg_replace('/\s+/', ' ', $content) ?? $content;
    if (strlen($content) <= 220) {
        return $content;
    }

    return rtrim(substr($content, 0, 217)) . '...';
}

function news_split_paragraphs(string $content): array
{
    $content = news_repair_text($content);
    $content = preg_replace('/\s+/', ' ', trim($content)) ?? trim($content);
    if ($content === '') {
        return [];
    }

    $blocks = preg_split('/\n{2,}/', $content) ?: [];
    $blocks = array_values(array_filter(array_map(
        static fn ($paragraph) => trim((string)$paragraph),
        $blocks
    )));

    if (count($blocks) > 1) {
        return $blocks;
    }

    $sentences = preg_split('/(?<=[.!?])\s+(?=[A-Z0-9"\'])/', $content) ?: [$content];
    $sentences = array_values(array_filter(array_map(
        static fn ($sentence) => trim((string)$sentence),
        $sentences
    )));

    if (count($sentences) <= 4) {
        return [$content];
    }

    $paragraphs = [];
    for ($index = 0; $index < count($sentences); $index += 3) {
        $paragraphs[] = implode(' ', array_slice($sentences, $index, 3));
    }

    return $paragraphs;
}

function news_try_extract_remote_image(string $link): ?string
{
    $link = trim($link);
    if ($link === '' || !preg_match('/^https?:\/\//i', $link)) {
        return null;
    }

    $html = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($link);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'FootyCraftNewsIndexer/1.0',
            CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml'],
        ]);
        $result = curl_exec($ch);
        if ($result !== false && is_string($result)) {
            $html = $result;
        }
        curl_close($ch);
    }

    if (!is_string($html) || $html === '') {
        return null;
    }

    $patterns = [
        '/<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']/i',
        '/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']/i',
        '/<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']/i',
        '/<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']/i',
    ];

    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $html, $matches) === 1) {
            $image = trim((string)($matches[1] ?? ''));
            if ($image !== '' && preg_match('/^https?:\/\//i', $image)) {
                return $image;
            }
        }
    }

    return null;
}

function news_maybe_enrich_image(array $article): array
{
    global $cnx;

    $image = trim((string)($article['image_url'] ?? ''));
    if ($image !== '') {
        $article['display_image'] = news_article_display_image($article);
        return $article;
    }

    $status = trim((string)($article['image_status'] ?? ''));
    if ($status === 'missing' || $status === 'blocked') {
        $article['display_image'] = news_article_display_image($article);
        return $article;
    }

    $resolved = news_try_extract_remote_image((string)($article['link'] ?? ''));
    if ($resolved !== null) {
        $stmt = $cnx->prepare('UPDATE news_articles SET image_url = ?, image_status = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute([$resolved, 'resolved', (int)$article['id']]);
        $article['image_url'] = $resolved;
        $article['image_status'] = 'resolved';
    } else {
        $stmt = $cnx->prepare('UPDATE news_articles SET image_status = ?, updated_at = NOW() WHERE id = ?');
        $stmt->execute(['missing', (int)$article['id']]);
        $article['image_status'] = 'missing';
    }

    $article['display_image'] = news_article_display_image($article);
    return $article;
}

function news_present_articles(array $articles, bool $enrichImages = false): array
{
    $presented = [];
    $enrichedCount = 0;

    foreach ($articles as $article) {
        if ($enrichImages && $enrichedCount < 4) {
            $article = news_maybe_enrich_image($article);
            $enrichedCount++;
        }

        $article['title'] = news_repair_text((string)($article['title'] ?? ''));
        $article['author'] = news_repair_text((string)($article['author'] ?? ''));
        $article['source_name'] = news_repair_text((string)($article['source_name'] ?? ''));
        $article['excerpt'] = news_extract_excerpt($article);
        $article['image_url'] = news_article_display_image($article);
        $article['display_image'] = $article['image_url'];
        $article['search_score'] = round((float)($article['search_score'] ?? 0), 4);
        $article['matched_terms'] = array_values(array_filter(array_map('trim', explode(',', (string)($article['matched_terms'] ?? '')))));
        $presented[] = $article;
    }

    return $presented;
}

function news_corpus_size(): int
{
    global $cnx;
    $row = getRow($cnx, 'SELECT COUNT(*) AS cnt FROM news_articles');
    return (int)($row['cnt'] ?? 0);
}

function news_list(): void
{
    global $cnx;

    $limit = max(1, min(30, (int)($_GET['limit'] ?? 12)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));

    $articles = getRows(
        $cnx,
        'SELECT id, source_name, source_csv, source_domain, title, link, author, published_at, published_raw, excerpt, \'\' AS content, image_url, fallback_image_url, image_status, 0::numeric AS search_score, \'\' AS matched_terms
         FROM news_articles
         ORDER BY published_at DESC NULLS LAST, id DESC
         LIMIT ? OFFSET ?',
        [$limit, $offset]
    );

    send_ok([
        'articles' => news_present_articles($articles, true),
        'total' => count($articles),
        'corpus_size' => news_corpus_size(),
        'model' => 'latest',
        'model_label' => 'Latest imported articles',
    ]);
}

function news_search(): void
{
    global $cnx;

    $query = safe_str($_GET['q'] ?? '');
    $limit = max(1, min(30, (int)($_GET['limit'] ?? 12)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $source = safe_str($_GET['source'] ?? '');

    $tokens = news_tokenize($query);
    if (!$tokens) {
        news_list();
        return;
    }

    $corpusSize = news_corpus_size();
    if ($corpusSize <= 0) {
        send_ok([
            'articles' => [],
            'total' => 0,
            'corpus_size' => 0,
            'query' => $query,
            'model' => 'probabilistic',
            'model_label' => 'Binary probabilistic model',
        ]);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($tokens), '?'));
    $where = "t.term IN ($placeholders)";
    $params = $tokens;

    if ($source !== '') {
        $where .= ' AND a.source_name = ?';
        $params[] = $source;
    }

    $countSql = "
        SELECT COUNT(*) AS cnt
        FROM (
            SELECT nat.article_id
            FROM news_article_terms nat
            JOIN news_terms t ON t.id = nat.term_id
            JOIN news_articles a ON a.id = nat.article_id
            WHERE $where
            GROUP BY nat.article_id
        ) matched_articles
    ";
    $countRow = getRow($cnx, $countSql, $params);
    $total = (int)($countRow['cnt'] ?? 0);

    $scoreSql = "
        SELECT
            a.id,
            a.source_name,
            a.source_csv,
            a.source_domain,
            a.title,
            a.link,
            a.author,
            a.published_at,
            a.published_raw,
            a.excerpt,
            '' AS content,
            a.image_url,
            a.fallback_image_url,
            a.image_status,
            COUNT(*) AS matched_term_count,
            STRING_AGG(t.term, ',') AS matched_terms,
            SUM(
                LN(1 + ((? - t.doc_freq + 0.5) / (t.doc_freq + 0.5))) *
                CASE WHEN nat.title_freq > 0 THEN 2.25 ELSE 1.0 END
            ) AS search_score
        FROM news_article_terms nat
        JOIN news_terms t ON t.id = nat.term_id
        JOIN news_articles a ON a.id = nat.article_id
        WHERE $where
        GROUP BY a.id
        ORDER BY matched_term_count DESC, search_score DESC, a.published_at DESC NULLS LAST, a.id DESC
        LIMIT ? OFFSET ?
    ";

    $resultParams = array_merge([$corpusSize], $params, [$limit, $offset]);
    $articles = getRows($cnx, $scoreSql, $resultParams);

    send_ok([
        'articles' => news_present_articles($articles, true),
        'total' => $total,
        'corpus_size' => $corpusSize,
        'query' => $query,
        'tokens' => $tokens,
        'model' => 'probabilistic',
        'model_label' => 'Binary probabilistic model',
    ]);
}

function news_detail(): void
{
    global $cnx;

    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        send_err('Article ID required');
    }

    $article = getRow(
        $cnx,
        'SELECT id, source_name, source_csv, source_domain, title, link, author, published_at, published_raw, excerpt, content, image_url, fallback_image_url, image_status
         FROM news_articles WHERE id = ? LIMIT 1',
        [$id]
    );

    if (!$article) {
        send_err('Article not found', 404);
    }

    $article = news_maybe_enrich_image($article);
    $article['excerpt'] = news_extract_excerpt($article);
    $article['image_url'] = news_article_display_image($article);
    $article['title'] = news_repair_text((string)($article['title'] ?? ''));
    $article['content'] = news_repair_text((string)($article['content'] ?? ''));
    $article['paragraphs'] = news_split_paragraphs((string)($article['content'] ?? ''));
    $article['author'] = news_repair_text((string)($article['author'] ?? ''));

    send_ok(['article' => $article]);
}
