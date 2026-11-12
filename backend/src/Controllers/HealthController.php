<?php

declare(strict_types=1);

final class HealthController
{
    public function index(): array
    {
        return [
            'status' => 'ok',
            'app' => 'SolarCRM API',
            'php_version' => PHP_VERSION,
            'timestamp' => gmdate('c'),
            'database' => 'pending_configuration',
            'message' => 'Backend health endpoint is online.',
        ];
    }
}
