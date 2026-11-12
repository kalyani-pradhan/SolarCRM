<?php

declare(strict_types=1);

$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    return require $configFile;
}

$env = getenv();
$databaseConfig = [
    'host' => $env['SOLARCRM_DB_HOST'] ?? '127.0.0.1',
    'port' => (int) ($env['SOLARCRM_DB_PORT'] ?? 3306),
    'dbname' => $env['SOLARCRM_DB_NAME'] ?? 'solarcrm',
    'username' => $env['SOLARCRM_DB_USER'] ?? 'solarcrm',
    'password' => $env['SOLARCRM_DB_PASSWORD'] ?? 'replace_with_db_password',
    'charset' => $env['SOLARCRM_DB_CHARSET'] ?? 'utf8mb4',
];

return [
    'app' => [
        'name' => 'SolarCRM API',
        'env' => $env['SOLARCRM_ENV'] ?? 'development',
        'base_url' => $env['SOLARCRM_BASE_URL'] ?? 'http://localhost:8080',
    ],
    'database' => $databaseConfig,
    'session' => [
        'name' => $env['SOLARCRM_SESSION_NAME'] ?? 'solarcrm_session',
        'lifetime' => (int) ($env['SOLARCRM_SESSION_LIFETIME'] ?? 3600),
        'secure' => filter_var($env['SOLARCRM_SESSION_SECURE'] ?? 'false', FILTER_VALIDATE_BOOLEAN),
        'httponly' => true,
        'samesite' => $env['SOLARCRM_SESSION_SAME_SITE'] ?? 'Lax',
        'csrf' => true,
    ],
    'cors' => [
        'allowed_origins' => array_filter(array_map('trim', explode(',', (string) ($env['SOLARCRM_ALLOWED_ORIGINS'] ?? 'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174')))),
        'allow_credentials' => true,
    ],
];
