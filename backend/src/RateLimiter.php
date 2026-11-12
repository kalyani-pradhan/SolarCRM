<?php

declare(strict_types=1);

final class RateLimiter
{
    public const MAX_ATTEMPTS = 5;
    public const WINDOW_SECONDS = 900;

    public static function isBlocked(string $identifier, string $ipAddress): bool
    {
        $db = new Database();
        $pdo = $db->getConnection();

        $stmt = $pdo->prepare(
            'SELECT COUNT(*) AS failed_attempts
             FROM login_attempts
             WHERE identifier = :identifier
               AND ip_address = :ip_address
               AND success = 0
               AND attempted_at >= DATE_SUB(NOW(), INTERVAL :window SECOND)'
        );

        $stmt->execute([
            ':identifier' => $identifier,
            ':ip_address' => $ipAddress,
            ':window' => self::WINDOW_SECONDS,
        ]);

        $row = $stmt->fetch();
        return (int) ($row['failed_attempts'] ?? 0) >= self::MAX_ATTEMPTS;
    }

    public static function recordFailure(string $identifier, string $ipAddress): void
    {
        $db = new Database();
        $pdo = $db->getConnection();

        $stmt = $pdo->prepare(
            'INSERT INTO login_attempts (identifier, ip_address, success, attempted_at)
             VALUES (:identifier, :ip_address, 0, NOW())'
        );
        $stmt->execute([
            ':identifier' => $identifier,
            ':ip_address' => $ipAddress,
        ]);
    }

    public static function clearFailures(string $identifier): void
    {
        $db = new Database();
        $pdo = $db->getConnection();

        $stmt = $pdo->prepare('DELETE FROM login_attempts WHERE identifier = :identifier');
        $stmt->execute([':identifier' => $identifier]);
    }
}
