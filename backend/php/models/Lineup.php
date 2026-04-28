<?php
declare(strict_types=1);

   
                                       
   
class Lineup {
    public $id;
    public $user_id;
    public $name;
    public $formation;
    public $chemistry;
    public $rating;
    public $is_public;
    public $likes_count;
    public $views_count;
    public $created_at;
    public $updated_at;
    public $username;
                             
    public $lineup_id;
    public $slots;

    public function __construct($user_id = 0, $name = '', $formation = '4-3-3') {
        $this->user_id = $user_id;
        $this->name = $name;
        $this->formation = $formation;
        $this->chemistry = 0;
        $this->is_public = false;
        $this->lineup_id = 0;
        $this->slots = [];
    }
}

const LINEUP_AUTOBUILD_MAX_EXPANSIONS = 2500;
const LINEUP_AUTOBUILD_TIME_BUDGET_MS = 150;
const LINEUP_AUTOBUILD_COMPAT_CANDIDATE_LIMIT = 8;
const LINEUP_AUTOBUILD_FALLBACK_CANDIDATE_LIMIT = 2;
const LINEUP_AUTOBUILD_RUNTIME_FALLBACK_LIMIT = 4;

function lineup_slot_position_options(string $slotCode): array
{
    return POSITION_MAP[$slotCode] ?? [$slotCode];
}

function lineup_primary_position(string $slotCode): string
{
    $options = lineup_slot_position_options($slotCode);
    return (string)($options[0] ?? $slotCode);
}

function lineup_position_fit_score(string $slotCode, array $player): int
{
    $position = (string)($player['position'] ?? '');
    if ($position === '') {
        return -15;
    }

    if ($position === lineup_primary_position($slotCode)) {
        return 8;
    }

    if (in_array($position, lineup_slot_position_options($slotCode), true)) {
        return 3;
    }

    return -15;
}

function lineup_link_bonus(?array $player, ?array $neighbor): int
{
    if (!$player || !$neighbor) {
        return 0;
    }

    if (($player['club'] ?? '') !== '' && ($player['club'] ?? '') === ($neighbor['club'] ?? '')) {
        return 18;
    }

    if (($player['league'] ?? '') !== '' && ($player['league'] ?? '') === ($neighbor['league'] ?? '')) {
        return 12;
    }

    if (($player['nation'] ?? '') !== '' && ($player['nation'] ?? '') === ($neighbor['nation'] ?? '')) {
        return 12;
    }

    return 0;
}

function lineup_intrinsic_score(string $slotCode, array $player): int
{
    return ((int)($player['overall'] ?? 0) * 10) + lineup_position_fit_score($slotCode, $player);
}

function lineup_inventory_affinity_stats(array $inventory): array
{
    $stats = [
        'club' => [],
        'league' => [],
        'nation' => [],
    ];

    foreach ($inventory as $player) {
        foreach (['club', 'league', 'nation'] as $field) {
            $value = (string)($player[$field] ?? '');
            if ($value === '') {
                continue;
            }
            $stats[$field][$value] = ($stats[$field][$value] ?? 0) + 1;
        }
    }

    return $stats;
}

function lineup_candidate_priority(string $slotCode, array $player, array $affinityStats): int
{
    $score = lineup_intrinsic_score($slotCode, $player);
    $score += max(0, (($affinityStats['club'][(string)($player['club'] ?? '')] ?? 1) - 1) * 6);
    $score += max(0, (($affinityStats['league'][(string)($player['league'] ?? '')] ?? 1) - 1) * 3);
    $score += max(0, (($affinityStats['nation'][(string)($player['nation'] ?? '')] ?? 1) - 1) * 3);
    return $score;
}

function lineup_sort_candidates_for_slot(string $slotCode, array $players, array $affinityStats): array
{
    usort($players, function (array $a, array $b) use ($slotCode, $affinityStats): int {
        $priorityA = lineup_candidate_priority($slotCode, $a, $affinityStats);
        $priorityB = lineup_candidate_priority($slotCode, $b, $affinityStats);
        if ($priorityA !== $priorityB) {
            return $priorityB <=> $priorityA;
        }

        $overallA = (int)($a['overall'] ?? 0);
        $overallB = (int)($b['overall'] ?? 0);
        if ($overallA !== $overallB) {
            return $overallB <=> $overallA;
        }

        return (int)($a['id'] ?? 0) <=> (int)($b['id'] ?? 0);
    });

    return $players;
}

function lineup_build_candidate_map(array $slotsOrder, array $inventory): array
{
    $affinityStats = lineup_inventory_affinity_stats($inventory);
    $candidateMap = [];

    foreach ($slotsOrder as $slotCode) {
        $compatible = [];
        $fallback = [];

        foreach ($inventory as $player) {
            $fitScore = lineup_position_fit_score($slotCode, $player);
            if ($fitScore >= 3) {
                $compatible[] = $player;
            } else {
                $fallback[] = $player;
            }
        }

        $compatible = lineup_sort_candidates_for_slot($slotCode, $compatible, $affinityStats);
        $fallback = lineup_sort_candidates_for_slot($slotCode, $fallback, $affinityStats);

        $candidates = array_slice($compatible, 0, LINEUP_AUTOBUILD_COMPAT_CANDIDATE_LIMIT);
        if (!$candidates) {
            $candidates = array_slice($fallback, 0, LINEUP_AUTOBUILD_COMPAT_CANDIDATE_LIMIT);
        } elseif (count($candidates) < 3 && $fallback) {
            $candidates = array_merge(
                $candidates,
                array_slice($fallback, 0, LINEUP_AUTOBUILD_FALLBACK_CANDIDATE_LIMIT)
            );
        }

        $candidateMap[$slotCode] = $candidates;
    }

    return $candidateMap;
}

function lineup_unique_adjacency_edges(array $slotsOrder, array $adjacency): array
{
    $slotIndex = array_flip($slotsOrder);
    $edges = [];

    foreach ($slotsOrder as $slotCode) {
        foreach (($adjacency[$slotCode] ?? []) as $neighbor) {
            if (!array_key_exists($neighbor, $slotIndex)) {
                continue;
            }

            $left = $slotIndex[$slotCode] <= $slotIndex[$neighbor] ? $slotCode : $neighbor;
            $right = $left === $slotCode ? $neighbor : $slotCode;
            $edges[$left . '|' . $right] = [$left, $right];
        }
    }

    return array_values($edges);
}

function lineup_filter_unused_players(array $players, array $usedIds): array
{
    return array_values(array_filter(
        $players,
        fn(array $player): bool => !isset($usedIds[(int)($player['id'] ?? 0)])
    ));
}

function lineup_runtime_fallback_candidates(string $slotCode, array $inventory, array $usedIds): array
{
    $available = lineup_filter_unused_players($inventory, $usedIds);
    if (!$available) {
        return [];
    }

    $affinityStats = lineup_inventory_affinity_stats($available);
    $available = lineup_sort_candidates_for_slot($slotCode, $available, $affinityStats);

    return array_slice($available, 0, LINEUP_AUTOBUILD_RUNTIME_FALLBACK_LIMIT);
}

function lineup_available_candidates_for_slot(
    string $slotCode,
    array $candidateMap,
    array $inventory,
    array $usedIds
): array {
    $candidates = lineup_filter_unused_players($candidateMap[$slotCode] ?? [], $usedIds);
    if ($candidates) {
        return $candidates;
    }

    return lineup_runtime_fallback_candidates($slotCode, $inventory, $usedIds);
}

function lineup_complete_assignment_score(array $assignment, array $slotsOrder, array $adjacency): int
{
    $score = 0;
    foreach ($slotsOrder as $slotCode) {
        $player = $assignment[$slotCode] ?? null;
        if ($player) {
            $score += lineup_intrinsic_score($slotCode, $player);
        }
    }

    foreach (lineup_unique_adjacency_edges($slotsOrder, $adjacency) as [$left, $right]) {
        $score += lineup_link_bonus($assignment[$left] ?? null, $assignment[$right] ?? null);
    }

    return $score;
}

function lineup_greedy_seed(array $slotsOrder, array $adjacency, array $candidateMap, array $inventory): array
{
    $assignment = [];
    $usedIds = [];
    $score = 0;

    foreach ($slotsOrder as $slotCode) {
        $candidates = lineup_available_candidates_for_slot($slotCode, $candidateMap, $inventory, $usedIds);
        if (!$candidates) {
            $assignment[$slotCode] = null;
            continue;
        }

        $bestPlayer = null;
        $bestDelta = PHP_INT_MIN;

        foreach ($candidates as $player) {
            $delta = lineup_intrinsic_score($slotCode, $player);
            foreach (($adjacency[$slotCode] ?? []) as $neighborSlot) {
                $delta += lineup_link_bonus($player, $assignment[$neighborSlot] ?? null);
            }

            if (
                $bestPlayer === null
                || $delta > $bestDelta
                || ($delta === $bestDelta && (int)($player['overall'] ?? 0) > (int)($bestPlayer['overall'] ?? 0))
            ) {
                $bestPlayer = $player;
                $bestDelta = $delta;
            }
        }

        if ($bestPlayer === null) {
            $assignment[$slotCode] = null;
            continue;
        }

        $assignment[$slotCode] = $bestPlayer;
        $usedIds[(int)$bestPlayer['id']] = true;
        $score += $bestDelta;
    }

    return [
        'assignment' => $assignment,
        'score' => lineup_complete_assignment_score($assignment, $slotsOrder, $adjacency),
    ];
}

function lineup_best_link_upper_bound_for_slot(
    string $slotCode,
    ?array $fixedPlayer,
    array $candidateMap,
    array $inventory,
    array $usedIds
): int {
    if (!$fixedPlayer) {
        return 18;
    }

    $best = 0;
    foreach (lineup_available_candidates_for_slot($slotCode, $candidateMap, $inventory, $usedIds) as $candidate) {
        $best = max($best, lineup_link_bonus($candidate, $fixedPlayer));
        if ($best >= 18) {
            break;
        }
    }

    return $best;
}

function lineup_astar_heuristic(
    array $state,
    array $slotsOrder,
    array $slotIndex,
    array $edges,
    array $candidateMap,
    array $inventory
): int {
    $assignment = $state['assignment'];
    $usedIds = $state['used_ids'];
    $hScore = 0;

    for ($i = $state['next_index']; $i < count($slotsOrder); $i++) {
        $slotCode = $slotsOrder[$i];
        $bestIntrinsic = 0;
        foreach (lineup_available_candidates_for_slot($slotCode, $candidateMap, $inventory, $usedIds) as $candidate) {
            $bestIntrinsic = max($bestIntrinsic, lineup_intrinsic_score($slotCode, $candidate));
        }
        $hScore += $bestIntrinsic;
    }

    foreach ($edges as [$left, $right]) {
        $leftAssigned = array_key_exists($left, $assignment) && $assignment[$left] !== null;
        $rightAssigned = array_key_exists($right, $assignment) && $assignment[$right] !== null;

        if ($leftAssigned && $rightAssigned) {
            continue;
        }

        if ($leftAssigned && !$rightAssigned && ($slotIndex[$right] ?? PHP_INT_MAX) >= $state['next_index']) {
            $hScore += lineup_best_link_upper_bound_for_slot($right, $assignment[$left], $candidateMap, $inventory, $usedIds);
            continue;
        }

        if ($rightAssigned && !$leftAssigned && ($slotIndex[$left] ?? PHP_INT_MAX) >= $state['next_index']) {
            $hScore += lineup_best_link_upper_bound_for_slot($left, $assignment[$right], $candidateMap, $inventory, $usedIds);
            continue;
        }

        if (!$leftAssigned && !$rightAssigned) {
            $hScore += 18;
        }
    }

    return $hScore;
}

function lineup_astar_search(array $slotsOrder, array $adjacency, array $inventory): array
{
    $candidateMap = lineup_build_candidate_map($slotsOrder, $inventory);
    $edges = lineup_unique_adjacency_edges($slotsOrder, $adjacency);
    $slotIndex = array_flip($slotsOrder);
    $greedy = lineup_greedy_seed($slotsOrder, $adjacency, $candidateMap, $inventory);

    $bestAssignment = $greedy['assignment'];
    $bestScore = $greedy['score'];

    $queue = new SplPriorityQueue();
    $queue->setExtractFlags(SplPriorityQueue::EXTR_DATA);

    $start = [
        'next_index' => 0,
        'assignment' => [],
        'used_ids' => [],
        'g_score' => 0,
    ];
    $start['f_score'] = lineup_astar_heuristic($start, $slotsOrder, $slotIndex, $edges, $candidateMap, $inventory);
    $queue->insert($start, $start['f_score']);

    $expansions = 0;
    $startedAt = microtime(true);

    while (!$queue->isEmpty()) {
        if ($expansions >= LINEUP_AUTOBUILD_MAX_EXPANSIONS) {
            break;
        }
        if (((microtime(true) - $startedAt) * 1000) >= LINEUP_AUTOBUILD_TIME_BUDGET_MS) {
            break;
        }

        $state = $queue->extract();
        $expansions++;

        if (($state['f_score'] ?? PHP_INT_MIN) <= $bestScore) {
            continue;
        }

        if ($state['next_index'] >= count($slotsOrder)) {
            if ($state['g_score'] > $bestScore) {
                $bestScore = $state['g_score'];
                $bestAssignment = $state['assignment'];
            }
            continue;
        }

        $slotCode = $slotsOrder[$state['next_index']];
        $candidates = lineup_available_candidates_for_slot($slotCode, $candidateMap, $inventory, $state['used_ids']);

        if (!$candidates) {
            $child = $state;
            $child['assignment'][$slotCode] = null;
            $child['next_index']++;
            $child['f_score'] = $child['g_score'] + lineup_astar_heuristic(
                $child,
                $slotsOrder,
                $slotIndex,
                $edges,
                $candidateMap,
                $inventory
            );
            if ($child['f_score'] > $bestScore) {
                $queue->insert($child, $child['f_score']);
            }
            continue;
        }

        foreach ($candidates as $player) {
            $delta = lineup_intrinsic_score($slotCode, $player);
            foreach (($adjacency[$slotCode] ?? []) as $neighborSlot) {
                $delta += lineup_link_bonus($player, $state['assignment'][$neighborSlot] ?? null);
            }

            $child = [
                'next_index' => $state['next_index'] + 1,
                'assignment' => $state['assignment'],
                'used_ids' => $state['used_ids'],
                'g_score' => $state['g_score'] + $delta,
            ];
            $child['assignment'][$slotCode] = $player;
            $child['used_ids'][(int)$player['id']] = true;

            $heuristic = lineup_astar_heuristic($child, $slotsOrder, $slotIndex, $edges, $candidateMap, $inventory);
            $child['f_score'] = $child['g_score'] + $heuristic;

            if ($child['f_score'] <= $bestScore) {
                continue;
            }

            $queue->insert($child, $child['f_score']);
        }
    }

    return [
        'assignment' => $bestAssignment,
        'search_score' => $bestScore,
        'expansions' => $expansions,
        'complete' => count(array_filter($bestAssignment, fn($player) => $player !== null)) === count($slotsOrder),
    ];
}
?>
