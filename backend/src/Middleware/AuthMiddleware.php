<?php

declare(strict_types=1);

final class AuthMiddleware
{
    public static function requireAuth(): void
    {
        SessionManager::initialize();

        if (empty($_SESSION['user']['id'])) {
            Response::error('Authentication required.', 401);
        }
    }

    public static function requireRole(string ...$roles): void
    {
        self::requireAuth();

        $allowedRoles = array_map(static fn (string $role): string => strtolower($role), $roles);
        $userRole = strtolower((string) ($_SESSION['user']['role'] ?? ''));

        if (!in_array($userRole, $allowedRoles, true)) {
            Response::error('Forbidden.', 403);
        }
    }
}
