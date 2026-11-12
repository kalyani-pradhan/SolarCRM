<?php

declare(strict_types=1);

final class CsrfMiddleware
{
    public static function verify(): void
    {
        SessionManager::initialize();

        if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            return;
        }

        $csrfToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $sessionToken = $_SESSION['csrf_token'] ?? '';

        if ($csrfToken === '' || !hash_equals((string) $sessionToken, (string) $csrfToken)) {
            Response::error('CSRF validation failed.', 419);
        }
    }
}
