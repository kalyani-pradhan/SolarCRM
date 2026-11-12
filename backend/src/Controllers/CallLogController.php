<?php

declare(strict_types=1);

final class CallLogController
{
    public static function index(): void
    {
        AuthMiddleware::requireAuth();

        $db = new Database();
        $pdo = $db->getConnection();
        $leadId = $_GET['lead_id'] ?? null;
        $search = trim((string) ($_GET['search'] ?? ''));

        $sql = 'SELECT c.*, l.name AS customer_name, l.phone AS customer_phone FROM call_logs c LEFT JOIN leads l ON l.id = c.lead_id WHERE 1=1';
        $params = [];

        if ($leadId !== null && $leadId !== '') {
            $sql .= ' AND c.lead_id = :lead_id';
            $params[':lead_id'] = (int) $leadId;
        }

        if ($search !== '') {
            $sql .= ' AND (LOWER(l.name) LIKE :search OR LOWER(l.phone) LIKE :search OR LOWER(COALESCE(c.call_notes, "")) LIKE :search)';
            $params[':search'] = '%' . strtolower($search) . '%';
        }

        $sql .= ' ORDER BY c.call_datetime DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::success([
            'items' => array_map([self::class, 'normalizeCallLog'], $rows),
        ]);
    }

    public static function create(): void
    {
        AuthMiddleware::requireAuth();

        $payload = self::decodeJsonBody();
        $leadId = isset($payload['leadId']) ? (int) $payload['leadId'] : 0;
        $customerName = trim((string) ($payload['customerName'] ?? ''));
        $phoneNumber = trim((string) ($payload['phoneNumber'] ?? ''));
        $callOutcome = trim((string) ($payload['callOutcome'] ?? 'Connected'));
        $callDate = trim((string) ($payload['callDate'] ?? date('Y-m-d')));
        $callTime = trim((string) ($payload['callTime'] ?? '09:00'));
        $discussionNotes = trim((string) ($payload['discussionNotes'] ?? ''));
        $followUpDate = trim((string) ($payload['followUpDate'] ?? ''));
        $followUpTime = trim((string) ($payload['followUpTime'] ?? ''));
        $followUpNotes = trim((string) ($payload['followUpNotes'] ?? ''));

        if ($leadId <= 0 || $customerName === '' || $phoneNumber === '') {
            Response::error('Lead id, customer name and phone are required.', 422);
        }

        $db = new Database();
        $pdo = $db->getConnection();
        $callAt = $callDate . ' ' . $callTime;

        $stmt = $pdo->prepare(
            'INSERT INTO call_logs (lead_id, user_id, call_outcome, call_notes, call_datetime, created_at) VALUES (:lead_id, :user_id, :call_outcome, :call_notes, :call_datetime, NOW())'
        );
        $stmt->execute([
            ':lead_id' => $leadId,
            ':user_id' => (int) ($_SESSION['user']['id'] ?? 0),
            ':call_outcome' => $callOutcome,
            ':call_notes' => $discussionNotes,
            ':call_datetime' => $callAt,
        ]);

        $callLogId = (int) $pdo->lastInsertId();

        if ($followUpDate !== '' || $followUpTime !== '') {
            $followDate = $followUpDate !== '' ? $followUpDate : date('Y-m-d');
            $followTime = $followUpTime !== '' ? $followUpTime : '09:00';

            $followStmt = $pdo->prepare(
                'INSERT INTO follow_ups (lead_id, assigned_to, created_by, due_at, status, notes, created_at, updated_at) VALUES (:lead_id, :assigned_to, :created_by, :due_at, :status, :notes, NOW(), NOW())'
            );
            $followStmt->execute([
                ':lead_id' => $leadId,
                ':assigned_to' => (int) ($_SESSION['user']['id'] ?? 0),
                ':created_by' => (int) ($_SESSION['user']['id'] ?? 0),
                ':due_at' => $followDate . ' ' . $followTime,
                ':status' => 'Upcoming',
                ':notes' => $followUpNotes,
            ]);
        }

        $leadStmt = $pdo->prepare('UPDATE leads SET status = :status, last_contact_at = :last_contact_at, updated_at = NOW() WHERE id = :id');
        $leadStmt->execute([
            ':status' => self::resolveLeadStatus((string) ($payload['currentStatus'] ?? 'New Lead'), $callOutcome),
            ':last_contact_at' => $callAt,
            ':id' => $leadId,
        ]);

        $record = self::fetchById($callLogId);
        Response::success(['item' => self::normalizeCallLog($record)], 'Call recorded successfully.', 201);
    }

    private static function fetchById(int $id): ?array
    {
        $db = new Database();
        $pdo = $db->getConnection();
        $stmt = $pdo->prepare('SELECT c.*, l.name AS customer_name, l.phone AS customer_phone FROM call_logs c LEFT JOIN leads l ON l.id = c.lead_id WHERE c.id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    private static function decodeJsonBody(): array
    {
        $body = json_decode((string) file_get_contents('php://input'), true);
        return is_array($body) ? $body : [];
    }

    private static function resolveLeadStatus(string $currentStatus, string $callOutcome): string
    {
        $statuses = ['New Lead', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Not Interested'];
        $outcome = trim($callOutcome);

        if ($outcome === 'Connected' || $outcome === 'Interested') {
            return 'Interested';
        }

        if ($outcome === 'Unreachable' || $outcome === 'No Response' || $outcome === 'Wrong Number') {
            return 'Follow-up';
        }

        if ($outcome === 'Not Interested' || $outcome === 'Rejected') {
            return 'Not Interested';
        }

        return in_array($currentStatus, $statuses, true) ? $currentStatus : 'Contacted';
    }

    public static function normalizeCallLog(array $row): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'leadId' => (int) ($row['lead_id'] ?? 0),
            'customerName' => (string) ($row['customer_name'] ?? ''),
            'phoneNumber' => (string) ($row['customer_phone'] ?? ''),
            'callOutcome' => (string) ($row['call_outcome'] ?? 'Connected'),
            'callDate' => isset($row['call_datetime']) ? date('Y-m-d', strtotime((string) $row['call_datetime'])) : date('Y-m-d'),
            'callTime' => isset($row['call_datetime']) ? date('H:i', strtotime((string) $row['call_datetime'])) : '09:00',
            'discussionNotes' => (string) ($row['call_notes'] ?? ''),
            'createdAt' => isset($row['created_at']) ? (string) $row['created_at'] : null,
        ];
    }
}
