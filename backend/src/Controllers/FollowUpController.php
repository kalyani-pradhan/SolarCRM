<?php

declare(strict_types=1);

final class FollowUpController
{
    public static function index(): void
    {
        AuthMiddleware::requireAuth();

        $db = new Database();
        $pdo = $db->getConnection();
        $status = trim((string) ($_GET['status'] ?? ''));
        $search = trim((string) ($_GET['search'] ?? ''));

        $sql = 'SELECT f.*, l.name AS customer_name, l.phone AS customer_phone FROM follow_ups f LEFT JOIN leads l ON l.id = f.lead_id WHERE 1=1';
        $params = [];

        if ($status !== '') {
            $sql .= ' AND f.status = :status';
            $params[':status'] = $status;
        }

        if ($search !== '') {
            $sql .= ' AND (LOWER(l.name) LIKE :search OR LOWER(l.phone) LIKE :search OR LOWER(COALESCE(f.notes, "")) LIKE :search)';
            $params[':search'] = '%' . strtolower($search) . '%';
        }

        $sql .= ' ORDER BY f.due_at ASC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::success([
            'items' => array_map([self::class, 'normalizeFollowUp'], $rows),
        ]);
    }

    public static function update(string $id): void
    {
        AuthMiddleware::requireAuth();

        $payload = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($payload)) {
            Response::error('Invalid payload.', 422);
        }

        $status = trim((string) ($payload['status'] ?? ''));
        $notes = trim((string) ($payload['notes'] ?? ''));

        $db = new Database();
        $pdo = $db->getConnection();
        $stmt = $pdo->prepare('UPDATE follow_ups SET status = :status, notes = :notes, updated_at = NOW() WHERE id = :id');
        $stmt->execute([
            ':status' => $status !== '' ? $status : 'Upcoming',
            ':notes' => $notes,
            ':id' => (int) $id,
        ]);

        if ($stmt->rowCount() === 0) {
            Response::error('Follow-up not found.', 404);
        }

        $updated = $pdo->prepare('SELECT f.*, l.name AS customer_name, l.phone AS customer_phone FROM follow_ups f LEFT JOIN leads l ON l.id = f.lead_id WHERE f.id = :id LIMIT 1');
        $updated->execute([':id' => (int) $id]);
        Response::success(['item' => self::normalizeFollowUp($updated->fetch())], 'Follow-up updated successfully.');
    }

    public static function normalizeFollowUp(array $row): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'leadId' => (int) ($row['lead_id'] ?? 0),
            'customerName' => (string) ($row['customer_name'] ?? ''),
            'phoneNumber' => (string) ($row['customer_phone'] ?? ''),
            'followUpDate' => isset($row['due_at']) ? date('Y-m-d', strtotime((string) $row['due_at'])) : date('Y-m-d'),
            'followUpTime' => isset($row['due_at']) ? date('H:i', strtotime((string) $row['due_at'])) : '09:00',
            'followUpNotes' => (string) ($row['notes'] ?? ''),
            'status' => (string) ($row['status'] ?? 'Upcoming'),
            'createdAt' => isset($row['created_at']) ? (string) $row['created_at'] : null,
        ];
    }
}
