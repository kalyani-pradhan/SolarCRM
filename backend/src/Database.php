<?php

declare(strict_types=1);

final class Database
{
    private PDO $connection;

    public function __construct(?array $config = null)
    {
        $resolvedConfig = $config ?? Config::load();
        $databaseConfig = $resolvedConfig['database'] ?? [];

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $databaseConfig['host'] ?? '127.0.0.1',
            (int) ($databaseConfig['port'] ?? 3306),
            $databaseConfig['dbname'] ?? 'solarcrm',
            $databaseConfig['charset'] ?? 'utf8mb4',
        );

        $this->connection = new PDO(
            $dsn,
            $databaseConfig['username'] ?? 'solarcrm',
            $databaseConfig['password'] ?? 'change_me',
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ],
        );
    }

    public function getConnection(): PDO
    {
        return $this->connection;
    }

    public function ping(): bool
    {
        try {
            $this->connection->query('SELECT 1');
            return true;
        } catch (Throwable) {
            return false;
        }
    }
}
