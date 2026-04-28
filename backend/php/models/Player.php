<?php
declare(strict_types=1);

   
                                       
   
class Player {
    public $id;
    public $name;
    public $full_name;
    public $position;
    public $nation;
    public $club;
    public $league;
    public $overall;
    public $pace;
    public $shooting;
    public $passing;
    public $dribbling;
    public $defending;
    public $physical;
    public $rarity;
    public $ea_player_id;
    public $card_url;
    public $image_url;
    public $card_type;

    public function __construct($name = '', $position = '', $overall = 75) {
        $this->name = $name;
        $this->position = $position;
        $this->overall = $overall;
    }
}

function player_card_normalize_name(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    if (class_exists('Normalizer')) {
        $normalized = Normalizer::normalize($value, Normalizer::FORM_D);
        if (is_string($normalized)) {
            $value = $normalized;
        }
    }

    $value = preg_replace('/\p{Mn}+/u', '', $value) ?? $value;
    $value = preg_replace("/['\\-\\.,]/u", '', $value) ?? $value;
    $value = preg_replace('/\s+/u', ' ', mb_strtolower($value, 'UTF-8')) ?? $value;
    return trim($value);
}

function player_card_candidate_names(array $player): array
{
    $raw = [];
    foreach (['full_name', 'name'] as $field) {
        $value = trim((string)($player[$field] ?? ''));
        if ($value !== '') {
            $raw[] = $value;
        }
    }

    $fullName = trim((string)($player['full_name'] ?? ''));
    if ($fullName !== '') {
        $parts = preg_split('/\s+/u', $fullName) ?: [];
        if (count($parts) >= 2) {
            $raw[] = $parts[0] . ' ' . $parts[count($parts) - 1];
            if (count($parts) >= 3) {
                $raw[] = $parts[0] . ' ' . $parts[1] . ' ' . $parts[count($parts) - 1];
            }
        }
    }

    $normalized = [];
    foreach ($raw as $value) {
        $key = player_card_normalize_name($value);
        if ($key !== '') {
            $normalized[$key] = true;
        }
    }

    return array_keys($normalized);
}

function player_card_local_catalog(): array
{
    static $catalog = null;
    if ($catalog !== null) {
        return $catalog;
    }

    $catalog = [];
    $dir = ROOT_DIR . '/frontend/assets/images/cards';
    if (!is_dir($dir)) {
        return $catalog;
    }

    $files = scandir($dir);
    if (!is_array($files)) {
        return $catalog;
    }

    foreach ($files as $file) {
        if (!is_string($file) || !preg_match('/\.webp$/i', $file)) {
            continue;
        }

        $stem = preg_replace('/\.webp$/i', '', $file) ?? $file;
        $cleanStem = preg_replace('/_\d+$/', '', $stem) ?? $stem;
        $key = player_card_normalize_name($cleanStem);
        if ($key !== '' && !isset($catalog[$key])) {
            $catalog[$key] = '/frontend/assets/images/cards/' . rawurlencode($file);
        }
    }

    return $catalog;
}

function player_card_drive_catalog(): array
{
    static $catalog = null;
    if ($catalog !== null) {
        return $catalog;
    }

    $catalog = [];
    $path = ROOT_DIR . '/scripts/drive_card_mapping.json';
    if (!is_file($path)) {
        return $catalog;
    }

    $json = file_get_contents($path);
    if (!is_string($json) || $json === '') {
        return $catalog;
    }

    $rows = json_decode($json, true);
    if (!is_array($rows)) {
        return $catalog;
    }

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $id = trim((string)($row['id'] ?? ''));
        $name = trim((string)($row['name'] ?? ''));
        if ($id === '' || $name === '') {
            continue;
        }

        $stem = preg_replace('/\.webp$/i', '', $name) ?? $name;
        $cleanStem = preg_replace('/_\d+$/', '', $stem) ?? $stem;
        $key = player_card_normalize_name($cleanStem);
        if ($key !== '' && !isset($catalog[$key])) {
            $catalog[$key] = 'https://drive.google.com/uc?export=download&id=' . rawurlencode($id);
        }
    }

    return $catalog;
}

function player_card_drive_direct_url(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }

    if (preg_match('/[?&]id=([a-zA-Z0-9_-]+)/', $value, $matches) === 1) {
        return 'https://drive.google.com/uc?export=download&id=' . $matches[1];
    }

    return $value;
}

function player_resolve_card_url(array $player): string
{
    $existing = trim((string)($player['card_url'] ?? ''));
    $candidates = player_card_candidate_names($player);
    $preferReplacement = $existing === '' || str_contains($existing, 'drive.google.com/thumbnail');

    if ($candidates) {
        $local = player_card_local_catalog();
        foreach ($candidates as $candidate) {
            if (isset($local[$candidate])) {
                return $local[$candidate];
            }
        }

        if ($preferReplacement) {
            $drive = player_card_drive_catalog();
            foreach ($candidates as $candidate) {
                if (isset($drive[$candidate])) {
                    return $drive[$candidate];
                }
            }
        }
    }

    if ($existing !== '') {
        return player_card_drive_direct_url($existing);
    }

    return '';
}
