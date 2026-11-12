<?php

declare(strict_types=1);

final class DashboardController
{
    public static function summary(): void
    {
        AuthMiddleware::requireAuth();

        $db = new Database();
        $pdo = $db->getConnection();

        $summary = [
            'totalLeads' => (int) $pdo->query('SELECT COUNT(*) FROM leads WHERE archived_at IS NULL')->fetchColumn(),
            'followUpsToday' => (int) $pdo->query('SELECT COUNT(*) FROM follow_ups WHERE DATE(due_at) = CURDATE() AND status = "Upcoming"')->fetchColumn(),
            'callsCompleted' => (int) $pdo->query('SELECT COUNT(*) FROM call_logs')->fetchColumn(),
            'conversions' => (int) $pdo->query('SELECT COUNT(*) FROM leads WHERE status = "Converted" AND archived_at IS NULL')->fetchColumn(),
        ];

        Response::success(['summary' => $summary]);
    }
}
