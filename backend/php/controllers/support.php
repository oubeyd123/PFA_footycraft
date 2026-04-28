<?php
declare(strict_types=1);

require_once ROOT_DIR . '/config/database.php';
global $cnx;

if (($_GET['group'] ?? '') === 'support') {
    $action = $_GET['action'] ?? '';

    try {
        switch ($action) {
            case 'my_list':
                support_my_list();
                break;
            case 'my_detail':
                support_my_detail();
                break;
            case 'create':
                support_create_ticket();
                break;
            case 'send':
                support_send_user_message();
                break;
            case 'admin_list':
                support_admin_list();
                break;
            case 'admin_detail':
                support_admin_detail();
                break;
            case 'admin_send':
                support_admin_send_message();
                break;
            case 'admin_resolve':
                support_admin_resolve_ticket();
                break;
            default:
                send_err('Action not found', 404);
        }
    } catch (Throwable $e) {
        send_err('Support error: ' . $e->getMessage());
    }
}

function support_now_expression(PDO $cnx): string
{
    $driver = (string) $cnx->getAttribute(PDO::ATTR_DRIVER_NAME);
    return $driver === 'pgsql' ? 'now()' : 'CURRENT_TIMESTAMP';
}

function support_notify_staff(PDO $cnx, string $content, ?int $excludeUserId = null): void
{
    $staff = getRows($cnx, "SELECT id FROM users WHERE role IN ('admin', 'support')");
    foreach ($staff as $row) {
        $staffId = (int) ($row['id'] ?? 0);
        if ($staffId <= 0) {
            continue;
        }
        if ($excludeUserId !== null && $staffId === $excludeUserId) {
            continue;
        }
        create_notification($cnx, $staffId, 'support', $content, '#support', 'support');
    }
}

function support_insert_ticket(PDO $cnx, int $userId, string $subject): int
{
    $driver = (string) $cnx->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'pgsql') {
        $stmt = $cnx->prepare(
            'INSERT INTO support_tickets (user_id, subject, status, created_at, updated_at, last_message_at)
             VALUES (?, ?, ?, now(), now(), now())
             RETURNING id'
        );
        $stmt->execute([$userId, $subject, 'open']);
        return (int) $stmt->fetchColumn();
    }

    $stmt = $cnx->prepare(
        'INSERT INTO support_tickets (user_id, subject, status, created_at, updated_at, last_message_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
    );
    $stmt->execute([$userId, $subject, 'open']);
    return (int) $cnx->lastInsertId();
}

function support_normalize_ticket(array $ticket): array
{
    $ticket['id'] = (int) ($ticket['id'] ?? 0);
    $ticket['user_id'] = isset($ticket['user_id']) ? (int) $ticket['user_id'] : null;
    $ticket['message_count'] = isset($ticket['message_count']) ? (int) $ticket['message_count'] : 0;
    return $ticket;
}

function support_normalize_message(array $msg): array
{
    $msg['id'] = (int) ($msg['id'] ?? 0);
    $msg['ticket_id'] = (int) ($msg['ticket_id'] ?? 0);
    $msg['sender_user_id'] = isset($msg['sender_user_id']) ? (int) $msg['sender_user_id'] : null;
    return $msg;
}

function support_get_ticket_by_id(PDO $cnx, int $ticketId): ?array
{
    $stmt = $cnx->prepare(
        'SELECT t.*, u.username AS user_username
         FROM support_tickets t
         JOIN users u ON u.id = t.user_id
         WHERE t.id = ?
         LIMIT 1'
    );
    $stmt->execute([$ticketId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function support_get_ticket_messages(PDO $cnx, int $ticketId): array
{
    $stmt = $cnx->prepare(
        "SELECT
            m.id,
            m.ticket_id,
            m.sender_user_id,
            m.sender_role,
            m.message,
            m.created_at,
            COALESCE(u.username,
                CASE
                    WHEN m.sender_role = 'system' THEN 'System'
                    WHEN m.sender_role = 'admin' THEN 'Support'
                    ELSE 'User'
                END
            ) AS sender_name
         FROM support_messages m
         LEFT JOIN users u ON u.id = m.sender_user_id
         WHERE m.ticket_id = ?
         ORDER BY m.created_at ASC, m.id ASC"
    );
    $stmt->execute([$ticketId]);
    $rows = $stmt->fetchAll() ?: [];

    return array_map('support_normalize_message', $rows);
}

function support_my_list(): void
{
    global $cnx;
    $user = require_auth();

    $stmt = $cnx->prepare(
        "SELECT
            t.id,
            t.user_id,
            t.subject,
            t.status,
            t.created_at,
            t.updated_at,
            t.last_message_at,
            t.closed_at,
            (
                SELECT m.message
                FROM support_messages m
                WHERE m.ticket_id = t.id
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
            ) AS latest_message,
            (
                SELECT m.sender_role
                FROM support_messages m
                WHERE m.ticket_id = t.id
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
            ) AS latest_sender_role,
            (
                SELECT COUNT(*)
                FROM support_messages m
                WHERE m.ticket_id = t.id
            ) AS message_count
         FROM support_tickets t
         WHERE t.user_id = ?
         ORDER BY COALESCE(t.last_message_at, t.updated_at, t.created_at) DESC, t.id DESC"
    );
    $stmt->execute([(int) $user['id']]);
    $rows = $stmt->fetchAll() ?: [];

    send_ok([
        'tickets' => array_map('support_normalize_ticket', $rows)
    ]);
}

function support_my_detail(): void
{
    global $cnx;
    $user = require_auth();

    $ticketId = (int) ($_GET['ticket_id'] ?? 0);
    if ($ticketId <= 0) {
        send_err('Invalid ticket ID');
    }

    $ticket = support_get_ticket_by_id($cnx, $ticketId);
    if (!$ticket) {
        send_err('Ticket not found', 404);
    }

    if ((int) $ticket['user_id'] !== (int) $user['id']) {
        send_err('Forbidden', 403);
    }

    $messages = support_get_ticket_messages($cnx, $ticketId);

    send_ok([
        'ticket' => support_normalize_ticket($ticket),
        'messages' => $messages
    ]);
}

function support_create_ticket(): void
{
    global $cnx;
    $user = require_auth();

    $subject = safe_str($_POST['subject'] ?? '');
    $message = safe_str($_POST['message'] ?? '');

    if ($subject === '' || $message === '') {
        send_err('Subject and message are required');
    }

    if (mb_strlen($subject) > 180) {
        send_err('Subject is too long');
    }

    $ticketId = support_insert_ticket($cnx, (int) $user['id'], $subject);

    $stmt = $cnx->prepare(
        'INSERT INTO support_messages (ticket_id, sender_user_id, sender_role, message)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$ticketId, (int) $user['id'], 'user', $message]);

    $ticket = support_get_ticket_by_id($cnx, $ticketId);

    support_notify_staff(
        $cnx,
        "New support ticket #{$ticketId} from {$user['username']}: {$subject}",
        null
    );
    create_notification(
        $cnx,
        (int) $user['id'],
        'support',
        "Your ticket #{$ticketId} was created. Support will reply soon.",
        '#support',
        'support'
    );

    send_ok([
        'ticket' => support_normalize_ticket($ticket ?: ['id' => $ticketId])
    ]);
}

function support_send_user_message(): void
{
    global $cnx;
    $user = require_auth();

    $ticketId = (int) ($_POST['ticket_id'] ?? 0);
    $message = safe_str($_POST['message'] ?? '');

    if ($ticketId <= 0 || $message === '') {
        send_err('Ticket ID and message are required');
    }

    $ticket = support_get_ticket_by_id($cnx, $ticketId);
    if (!$ticket) {
        send_err('Ticket not found', 404);
    }

    if ((int) $ticket['user_id'] !== (int) $user['id']) {
        send_err('Forbidden', 403);
    }

    if (($ticket['status'] ?? 'open') === 'closed') {
        send_err('This ticket is resolved. Please create a new ticket for additional help.', 409);
    }

    $stmt = $cnx->prepare(
        'INSERT INTO support_messages (ticket_id, sender_user_id, sender_role, message)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$ticketId, (int) $user['id'], 'user', $message]);

    $nowExpr = support_now_expression($cnx);
    $stmt = $cnx->prepare(
        "UPDATE support_tickets
         SET status = 'open', updated_at = {$nowExpr}, last_message_at = {$nowExpr}, closed_at = NULL
         WHERE id = ?"
    );
    $stmt->execute([$ticketId]);

    support_notify_staff(
        $cnx,
        "New reply on ticket #{$ticketId} from {$user['username']}",
        null
    );

    send_ok(['message' => 'Message sent']);
}

function support_admin_list(): void
{
    global $cnx;
    $support_user = require_support();

    $status = strtolower(safe_str($_GET['status'] ?? 'open'));
    $allowed = ['open', 'closed', 'all'];
    if (!in_array($status, $allowed, true)) {
        $status = 'open';
    }

    $where = '';
    $params = [];
    if ($status !== 'all') {
        $where = 'WHERE t.status = ?';
        $params[] = $status;
    }

    $stmt = $cnx->prepare(
        "SELECT
            t.id,
            t.user_id,
            t.subject,
            t.status,
            t.created_at,
            t.updated_at,
            t.last_message_at,
            t.closed_at,
            u.username,
            u.email,
            (
                SELECT m.message
                FROM support_messages m
                WHERE m.ticket_id = t.id
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
            ) AS latest_message,
            (
                SELECT m.sender_role
                FROM support_messages m
                WHERE m.ticket_id = t.id
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
            ) AS latest_sender_role,
            (
                SELECT COUNT(*)
                FROM support_messages m
                WHERE m.ticket_id = t.id
            ) AS message_count
         FROM support_tickets t
         JOIN users u ON u.id = t.user_id
         {$where}
         ORDER BY
            CASE WHEN t.status = 'open' THEN 0 ELSE 1 END,
            COALESCE(t.last_message_at, t.updated_at, t.created_at) DESC,
            t.id DESC"
    );
    $stmt->execute($params);
    $rows = $stmt->fetchAll() ?: [];

    send_ok([
        'tickets' => array_map('support_normalize_ticket', $rows)
    ]);
}

function support_admin_detail(): void
{
    global $cnx;
    $support_user = require_support();

    $ticketId = (int) ($_GET['ticket_id'] ?? 0);
    if ($ticketId <= 0) {
        send_err('Invalid ticket ID');
    }

    $ticket = support_get_ticket_by_id($cnx, $ticketId);
    if (!$ticket) {
        send_err('Ticket not found', 404);
    }

    $messages = support_get_ticket_messages($cnx, $ticketId);

    send_ok([
        'ticket' => support_normalize_ticket($ticket),
        'messages' => $messages
    ]);
}

function support_admin_send_message(): void
{
    global $cnx;
    $support_user = require_support();

    $ticketId = (int) ($_POST['ticket_id'] ?? 0);
    $message = safe_str($_POST['message'] ?? '');

    if ($ticketId <= 0 || $message === '') {
        send_err('Ticket ID and message are required');
    }

    $ticket = support_get_ticket_by_id($cnx, $ticketId);
    if (!$ticket) {
        send_err('Ticket not found', 404);
    }

    if (($ticket['status'] ?? 'open') === 'closed') {
        send_err('This ticket is already resolved.', 409);
    }

    $stmt = $cnx->prepare(
        'INSERT INTO support_messages (ticket_id, sender_user_id, sender_role, message)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$ticketId, (int) $support_user['id'], 'admin', $message]);

    $nowExpr = support_now_expression($cnx);
    $stmt = $cnx->prepare(
        "UPDATE support_tickets
         SET status = 'open', updated_at = {$nowExpr}, last_message_at = {$nowExpr}, closed_at = NULL
         WHERE id = ?"
    );
    $stmt->execute([$ticketId]);

    create_notification(
        $cnx,
        (int) $ticket['user_id'],
        'support',
        "Support replied to your ticket #{$ticketId}.",
        '#support',
        'support'
    );

    send_ok(['message' => 'Reply sent']);
}

function support_admin_resolve_ticket(): void
{
    global $cnx;
    $support_user = require_support();

    $ticketId = (int) ($_POST['ticket_id'] ?? 0);
    if ($ticketId <= 0) {
        send_err('Invalid ticket ID');
    }

    $ticket = support_get_ticket_by_id($cnx, $ticketId);
    if (!$ticket) {
        send_err('Ticket not found', 404);
    }

    $nowExpr = support_now_expression($cnx);
    $stmt = $cnx->prepare(
        "UPDATE support_tickets
         SET status = 'closed', updated_at = {$nowExpr}, closed_at = {$nowExpr}
         WHERE id = ?"
    );
    $stmt->execute([$ticketId]);

    create_notification(
        $cnx,
        (int) $ticket['user_id'],
        'support',
        "Your ticket #{$ticketId} has been resolved.",
        '#support',
        'support'
    );

    send_ok(['message' => 'Ticket resolved']);
}
