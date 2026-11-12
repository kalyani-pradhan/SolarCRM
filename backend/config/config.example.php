<?php

declare(strict_types=1);

return [
    'app' => [
        'name' => 'SolarCRM API',
        'env' => 'development',
        'base_url' => 'http://localhost:8080',
    ],
    'database' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'dbname' => 'solarcrm',
        'username' => 'solarcrm',
        'password' => 'replace_with_host_password',
        'charset' => 'utf8mb4',
    ],
    'session' => [
        'name' => 'solarcrm_session',
        'lifetime' => 3600,
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax',
        'csrf' => true,
    ],
    'cors' => [
        'allowed_origins' => [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
        ],
        'allow_credentials' => true,
    ],
];
