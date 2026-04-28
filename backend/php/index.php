<?php
declare(strict_types=1);

define('ROOT_DIR', dirname(__DIR__, 2));
define('PHP_DIR', __DIR__);
define('API_PREFIX', '/backend/php/controllers');

                                          
require_once ROOT_DIR . '/config/database.php';
require_once PHP_DIR . '/core/helpers.php';
require_once PHP_DIR . '/core/data.php';

                                                         
$method = $_SERVER['REQUEST_METHOD'];
$uri    = strtok($_SERVER['REQUEST_URI'], '?');
$uri    = rtrim($uri ?: '/', '/');

if ($uri === API_PREFIX || str_starts_with($uri, API_PREFIX . '/')) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    header('Content-Type: application/json; charset=UTF-8');
    if ($origin !== '') {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, X-FC-Session');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if ($method === 'OPTIONS') { http_response_code(204); exit; }

    try {
        route_api($uri, $method);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'data' => null, 'error' => $e->getMessage()]);
    }
    exit;
}

serve_static($uri);

                       
function route_api(string $uri, string $method): void {
                                    
    $path   = ltrim(substr($uri, strlen(API_PREFIX)), '/');
    $parts  = explode('/', $path, 3);
    $group  = $parts[0] ?? '';
    $action = $parts[1] ?? '';

    $_GET['group'] = $group;
    $_GET['action'] = $action;

    switch ($group) {
        case 'auth':
            require_once PHP_DIR . '/controllers/auth.php';
            break;
        case 'players':
            require_once PHP_DIR . '/controllers/players.php';
            break;
        case 'inventory':
            require_once PHP_DIR . '/controllers/inventory.php';
            break;
        case 'lineups':
            require_once PHP_DIR . '/controllers/challenges.php';
            require_once PHP_DIR . '/controllers/chemistry.php';                       
            require_once PHP_DIR . '/controllers/lineups.php';
            break;
        case 'team':
            require_once PHP_DIR . '/controllers/challenges.php';
            require_once PHP_DIR . '/controllers/chemistry.php';
            break;
        case 'chests':
            require_once PHP_DIR . '/controllers/challenges.php';
            require_once PHP_DIR . '/controllers/chests.php';
            break;
        case 'play':
            require_once PHP_DIR . '/controllers/challenges.php';
            require_once PHP_DIR . '/controllers/chemistry.php';
            require_once PHP_DIR . '/controllers/lineups.php';
            require_once PHP_DIR . '/controllers/play.php';
            break;
        case 'matches':
            require_once PHP_DIR . '/controllers/matches.php';
            break;
        case 'division':
            require_once PHP_DIR . '/controllers/division.php';
            break;
        case 'challenges':
            require_once PHP_DIR . '/controllers/challenges.php';
            break;
        case 'settings':
            require_once PHP_DIR . '/controllers/settings.php';
            break;
        case 'home':
            require_once PHP_DIR . '/controllers/home.php';
            break;
        case 'community':
            require_once PHP_DIR . '/controllers/community.php';
            break;
        case 'news':
            require_once PHP_DIR . '/controllers/news.php';
            break;
        case 'admin':
            require_once PHP_DIR . '/controllers/admin.php';
            break;
        case 'notifications':
            require_once PHP_DIR . '/controllers/notifications.php';
            break;
        case 'support':
            require_once PHP_DIR . '/controllers/support.php';
            break;
        default:
            send_err('Not found', 404);
    }
}

function is_api_request(string $uri): bool {
    return $uri === API_PREFIX
        || str_starts_with($uri, API_PREFIX . '/');
}

                               
function serve_static(string $uri): void {
                                                                                        
    $normalized = $uri ?: '/';
    $trimmed = ltrim($normalized, '/');
    if (
        $trimmed !== '' && (
            str_starts_with($trimmed, '.') ||
            str_starts_with($trimmed, 'api/') ||
            str_starts_with($trimmed, 'backend/php/') ||
            str_starts_with($trimmed, '.data/')
        )
    ) {
        http_response_code(403);
        echo 'Forbidden';
        return;
    }

    if ($normalized === '' || $normalized === '/') {
        $candidates = [
            ROOT_DIR . '/frontend/views/home/index.html',
        ];
        foreach ($candidates as $f) {
            if (file_exists($f)) { serve_file($f); return; }
        }
        http_response_code(404);
        echo 'Not found';
        return;
    }

    $file = ROOT_DIR . urldecode($normalized);
    if (file_exists($file) && is_file($file)) {
        serve_file($file);
        return;
    }

                          
    if (file_exists($file . '.html')) { serve_file($file . '.html'); return; }

    http_response_code(404);
    echo 'Not found';
}

function serve_file(string $file): void {
    $mime_map = [
        'html'  => 'text/html; charset=UTF-8',
        'css'   => 'text/css',
        'js'    => 'application/javascript',
        'json'  => 'application/json',
        'png'   => 'image/png',
        'jpg'   => 'image/jpeg',
        'jpeg'  => 'image/jpeg',
        'gif'   => 'image/gif',
        'webp'  => 'image/webp',
        'svg'   => 'image/svg+xml',
        'ico'   => 'image/x-icon',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf'   => 'font/ttf',
        'mp4'   => 'video/mp4',
        'webm'  => 'video/webm',
        'mp3'   => 'audio/mpeg',
        'ogg'   => 'audio/ogg',
        'wav'   => 'audio/wav',
        'pdf'   => 'application/pdf',
        'txt'   => 'text/plain',
    ];
    $ext      = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $mime     = $mime_map[$ext] ?? 'application/octet-stream';
    $filesize = filesize($file);

    header('Content-Type: ' . $mime);
    header('Accept-Ranges: bytes');

    $range = $_SERVER['HTTP_RANGE'] ?? '';
    if ($range && preg_match('/bytes=(\d*)-(\d*)/i', $range, $m)) {
        $start = $m[1] !== '' ? (int)$m[1] : 0;
        $end   = $m[2] !== '' ? (int)$m[2] : $filesize - 1;
        $end   = min($end, $filesize - 1);
        if ($start > $end || $start >= $filesize) {
            http_response_code(416);
            header('Content-Range: bytes */' . $filesize);
            return;
        }
        $length = $end - $start + 1;
        http_response_code(206);
        header('Content-Range: bytes ' . $start . '-' . $end . '/' . $filesize);
        header('Content-Length: ' . $length);
        $fp = fopen($file, 'rb');
        fseek($fp, $start);
        $remaining = $length;
        while ($remaining > 0 && !feof($fp)) {
            $chunk = fread($fp, min(65536, $remaining));
            echo $chunk;
            $remaining -= strlen($chunk);
        }
        fclose($fp);
        return;
    }

    header('Content-Length: ' . $filesize);
    readfile($file);
}
