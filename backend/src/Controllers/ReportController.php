<?php

declare(strict_types=1);

final class ReportController
{
    public static function summary(): void
    {
        AuthMiddleware::requireAuth();

        $db = new Database();
        $pdo = $db->getConnection();

        $statusSummary = $pdo->query(
            'SELECT status, COUNT(*) as total FROM leads WHERE archived_at IS NULL GROUP BY status ORDER BY total DESC'
        )->fetchAll();

        $followUpSummary = $pdo->query(
            'SELECT status, COUNT(*) as total FROM follow_ups GROUP BY status ORDER BY total DESC'
        )->fetchAll();

        Response::success([
            'leadStatusSummary' => $statusSummary,
            'followUpSummary' => $followUpSummary,
        ]);
    }
}
