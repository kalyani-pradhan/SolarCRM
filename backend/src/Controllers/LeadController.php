<?php

declare(strict_types=1);

final class LeadController
{
    public static function index(): void
    {
        AuthMiddleware::requireAuth();

        $db = new Database();
        $pdo = $db->getConnection();

        $search = trim((string) ($_GET['search'] ?? ''));
        $status = trim((string) ($_GET['status'] ?? ''));
        $source = trim((string) ($_GET['source'] ?? ''));
        $assignedTo = trim((string) ($_GET['assigned_to'] ?? ''));
        $includeArchived = filter_var($_GET['include_archived'] ?? 'false', FILTER_VALIDATE_BOOLEAN);

        $sql = 'SELECT l.*, u.name AS assigned_to_name FROM leads l LEFT JOIN users u ON u.id = l.assigned_to WHERE 1=1';
        $params = [];

        if ($search !== '') {
            $sql .= ' AND (LOWER(l.name) LIKE :search OR LOWER(l.phone) LIKE :search OR LOWER(COALESCE(l.company, "")) LIKE :search OR LOWER(COALESCE(l.email, "")) LIKE :search)';
            $params[':search'] = '%' . strtolower($search) . '%';
        }

        if ($status !== '') {
            $sql .= ' AND l.status = :status';
            $params[':status'] = $status;
        }

        if ($source !== '') {
            $sql .= ' AND l.source = :source';
            $params[':source'] = $source;
        }

        if ($assignedTo !== '') {
            $sql .= ' AND (u.name = :assigned_to OR l.assigned_to = :assigned_to_id)';
            $params[':assigned_to'] = $assignedTo;
            $params[':assigned_to_id'] = (int) $assignedTo;
        }

        if (!$includeArchived) {
            $sql .= ' AND l.archived_at IS NULL';
        }

        $sql .= ' ORDER BY l.created_at DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::success([
            'items' => array_map([self::class, 'normalizeLead'], $rows),
        ]);
    }

    public static function show(string $id): void
    {
        AuthMiddleware::requireAuth();

        $leadId = (int) $id;
        $db = new Database();
        $pdo = $db->getConnection();
        $stmt = $pdo->prepare('SELECT l.*, u.name AS assigned_to_name FROM leads l LEFT JOIN users u ON u.id = l.assigned_to WHERE l.id = :id LIMIT 1');
        $stmt->execute([':id' => $leadId]);
        $lead = $stmt->fetch();

        if ($lead === false) {
            Response::error('Lead not found.', 404);
        }

        Response::success([
            'item' => self::normalizeLead($lead),
        ]);
    }

    public static function create(): void
    {
        AuthMiddleware::requireAuth();

        $payload = self::decodeJsonBody();
        $lead = self::validatePayload($payload, false);

        $db = new Database();
        $pdo = $db->getConnection();

        $phone = normalizePhoneForStorage($lead['phone']);
        $duplicate = $pdo->prepare('SELECT id FROM leads WHERE phone = :phone AND archived_at IS NULL LIMIT 1');
        $duplicate->execute([':phone' => $phone]);
        if ($duplicate->fetch() !== false) {
            Response::error('A lead with this phone number already exists.', 409);
        }

        $dateAdded = $lead['dateAdded'] ?? date('Y-m-d');
        $stmt = $pdo->prepare(
            'INSERT INTO leads (name, phone, email, company, source, status, notes, assigned_to, created_by, updated_by, date_added, last_contact_at, created_at, updated_at) VALUES (:name, :phone, :email, :company, :source, :status, :notes, :assigned_to, :created_by, :updated_by, :date_added, :last_contact_at, NOW(), NOW())'
        );

        $stmt->execute([
            ':name' => $lead['name'],
            ':phone' => $phone,
            ':email' => $lead['email'],
            ':company' => $lead['company'],
            ':source' => $lead['source'],
            ':status' => $lead['status'],
            ':notes' => $lead['notes'],
            ':assigned_to' => $lead['assignedToId'] ?? null,
            ':created_by' => (int) ($_SESSION['user']['id'] ?? 0),
            ':updated_by' => (int) ($_SESSION['user']['id'] ?? 0),
            ':date_added' => $dateAdded,
            ':last_contact_at' => $dateAdded,
        ]);

        $leadId = (int) $pdo->lastInsertId();
        $created = self::fetchById($leadId);
        Response::success(['item' => self::normalizeLead($created)], 'Lead created successfully.', 201);
    }

    public static function update(string $id): void
    {
        AuthMiddleware::requireAuth();

        $payload = self::decodeJsonBody();
        $lead = self::validatePayload($payload, true);

        $db = new Database();
        $pdo = $db->getConnection();
        $leadId = (int) $id;

        $existing = self::fetchById($leadId);
        if ($existing === null) {
            Response::error('Lead not found.', 404);
        }

        $phone = normalizePhoneForStorage($lead['phone']);
        $duplicate = $pdo->prepare('SELECT id FROM leads WHERE phone = :phone AND id != :id AND archived_at IS NULL LIMIT 1');
        $duplicate->execute([':phone' => $phone, ':id' => $leadId]);
        if ($duplicate->fetch() !== false) {
            Response::error('A lead with this phone number already exists.', 409);
        }

        $stmt = $pdo->prepare(
            'UPDATE leads SET name = :name, phone = :phone, email = :email, company = :company, source = :source, status = :status, notes = :notes, assigned_to = :assigned_to, updated_by = :updated_by, last_contact_at = :last_contact_at, updated_at = NOW() WHERE id = :id'
        );

        $stmt->execute([
            ':name' => $lead['name'],
            ':phone' => $phone,
            ':email' => $lead['email'],
            ':company' => $lead['company'],
            ':source' => $lead['source'],
            ':status' => $lead['status'],
            ':notes' => $lead['notes'],
            ':assigned_to' => $lead['assignedToId'] ?? null,
            ':updated_by' => (int) ($_SESSION['user']['id'] ?? 0),
            ':last_contact_at' => $lead['lastContact'] ?? date('Y-m-d'),
            ':id' => $leadId,
        ]);

        $updated = self::fetchById($leadId);
        Response::success(['item' => self::normalizeLead($updated)], 'Lead updated successfully.');
    }

    public static function archive(string $id): void
    {
        AuthMiddleware::requireAuth();

        $leadId = (int) $id;
        $db = new Database();
        $pdo = $db->getConnection();
        $stmt = $pdo->prepare('UPDATE leads SET archived_at = NOW(), archived_by = :user_id, updated_at = NOW() WHERE id = :id AND archived_at IS NULL');
        $stmt->execute([
            ':user_id' => (int) ($_SESSION['user']['id'] ?? 0),
            ':id' => $leadId,
        ]);

        if ($stmt->rowCount() === 0) {
            Response::error('Lead not found or already archived.', 404);
        }

        Response::success([], 'Lead archived successfully.');
    }

    public static function restore(string $id): void
    {
        AuthMiddleware::requireAuth();

        $leadId = (int) $id;
        $db = new Database();
        $pdo = $db->getConnection();
        $stmt = $pdo->prepare('UPDATE leads SET archived_at = NULL, archived_by = NULL, updated_at = NOW() WHERE id = :id');
        $stmt->execute([':id' => $leadId]);

        if ($stmt->rowCount() === 0) {
            Response::error('Lead not found.', 404);
        }

        Response::success([], 'Lead restored successfully.');
    }

    private static function fetchById(int $id): ?array
    {
        $db = new Database();
        $pdo = $db->getConnection();
        $stmt = $pdo->prepare('SELECT l.*, u.name AS assigned_to_name FROM leads l LEFT JOIN users u ON u.id = l.assigned_to WHERE l.id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    private static function decodeJsonBody(): array
    {
        $body = json_decode((string) file_get_contents('php://input'), true);
        return is_array($body) ? $body : [];
    }

    private static function validatePayload(array $payload, bool $allowPartial): array
    {
        $data = $allowPartial ? $payload : array_merge([
            'name' => '',
            'phone' => '',
            'source' => 'Website',
            'status' => 'New Lead',
            'assignedTo' => 'Conditions',
            'email' => null,
            'company' => null,
            'notes' => null,
        ], $payload);

        $name = trim((string) ($data['name'] ?? ''));
        $phone = trim((string) ($data['phone'] ?? ''));
        if ($name === '' || $phone === '') {
            Response::error('Name and phone are required.', 422);
        }

        $validSources = ['Website', 'Facebook', 'Instagram', 'Google Ads', 'Referral', 'Phone Call', 'Other'];
        $validStatuses = ['New Lead', 'Contacted', 'Interested', 'Follow-up', 'Converted', 'Not Interested'];

        $source = (string) ($data['source'] ?? 'Website');
        $status = (string) ($data['status'] ?? 'New Lead');
        if (!in_array($source, $validSources, true)) {
            Response::error('Invalid lead source.', 422);
        }
        if (!in_array($status, $validStatuses, true)) {
            Response::error('Invalid lead status.', 422);
        }

        $assignedTo = (string) ($data['assignedTo'] ?? 'Conditions');
        $assignedToId = null;
        if ($assignedTo !== '') {
            $db = new Database();
            $pdo = $db->getConnection();
            $userStmt = $pdo->prepare('SELECT id FROM users WHERE name = :name LIMIT 1');
            $userStmt->execute([':name' => $assignedTo]);
            $user = $userStmt->fetch();
            $assignedToId = $user !== false ? (int) $user['id'] : null;
        }

        return [
            'name' => $name,
            'phone' => $phone,
            'email' => isset($data['email']) && trim((string) $data['email']) !== '' ? trim((string) $data['email']) : null,
            'company' => isset($data['company']) && trim((string) $data['company']) !== '' ? trim((string) $data['company']) : null,
            'source' => $source,
            'status' => $status,
            'assignedTo' => $assignedTo,
            'assignedToId' => $assignedToId,
            'notes' => isset($data['notes']) && trim((string) $data['notes']) !== '' ? trim((string) $data['notes']) : null,
            'dateAdded' => isset($data['dateAdded']) && trim((string) $data['dateAdded']) !== '' ? trim((string) $data['dateAdded']) : date('Y-m-d'),
            'lastContact' => isset($data['lastContact']) && trim((string) $data['lastContact']) !== '' ? trim((string) $data['lastContact']) : date('Y-m-d'),
        ];
    }

    public static function normalizeLead(array $row): array
    {
        $phone = (string) ($row['phone'] ?? '');
        $name = (string) ($row['name'] ?? '');
        $assignedTo = (string) ($row['assigned_to_name'] ?? $row['assigned_to'] ?? 'Conditions');

        return [
            'id' => (int) ($row['id'] ?? 0),
            'name' => $name,
            'phone' => $phone,
            'email' => isset($row['email']) && $row['email'] !== null ? (string) $row['email'] : null,
            'company' => isset($row['company']) && $row['company'] !== null ? (string) $row['company'] : null,
            'source' => (string) ($row['source'] ?? 'Website'),
            'assignedTo' => $assignedTo,
            'status' => (string) ($row['status'] ?? 'New Lead'),
            'lastContact' => isset($row['last_contact_at']) && $row['last_contact_at'] ? (string) $row['last_contact_at'] : (string) ($row['updated_at'] ?? date('Y-m-d')),
            'initials' => strtoupper(substr($name, 0, 2)),
            'dateAdded' => isset($row['date_added']) && $row['date_added'] ? (string) $row['date_added'] : (string) ($row['created_at'] ?? date('Y-m-d')),
            'notes' => isset($row['notes']) && $row['notes'] !== null ? (string) $row['notes'] : null,
            'isDeleted' => !empty($row['archived_at']),
            'createdAt' => isset($row['created_at']) ? (string) $row['created_at'] : null,
            'updatedAt' => isset($row['updated_at']) ? (string) $row['updated_at'] : null,
        ];
    }
}

function normalizePhoneForStorage(string $value): string
{
    return preg_replace('/[^0-9]/', '', $value) ?: '';
}
