<?php

declare(strict_types=1);

final class SessionManager
{
    public static function initialize(): void
    {
        $config = Config::load();
        $sessionConfig = $config['session'] ?? [];

        session_name((string) ($sessionConfig['name'] ?? 'solarcrm_session'));

        $cookieParams = [
            'lifetime' => (int) ($sessionConfig['lifetime'] ?? 3600),
            'path' => '/',
            'domain' => '',
            'secure' => self::shouldUseSecureCookies(),
            'httponly' => true,
            'samesite' => (string) ($sessionConfig['samesite'] ?? 'Lax'),
        ];

        if (PHP_VERSION_ID >= 70300) {
            session_set_cookie_params($cookieParams);
        } else {
            session_set_cookie_params(
                $cookieParams['lifetime'],
                $cookieParams['path'],
                $cookieParams['domain'],
                $cookieParams['secure'],
                $cookieParams['httponly'],
            );
        }

        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
    }

    public static function requireCsrfToken(): void
    {
        self::initialize();

        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        $sessionToken = $_SESSION['csrf_token'] ?? '';

        if ($token === '' || !hash_equals((string) $sessionToken, (string) $token)) {
            Response::error('CSRF validation failed.', 403);
        }
    }

    public static function regenerate(): void
    {
        self::initialize();
        session_regenerate_id(true);
    }

    public static function destroy(): void
    {
        self::initialize();

        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 3600,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly'],
            );
        }

        session_destroy();
    }

    private static function shouldUseSecureCookies(): bool
    {
        $env = (string) ($_SERVER['SOLARCRM_ENV'] ?? getenv('SOLARCRM_ENV') ?: 'development');
        if (strtolower($env) !== 'production') {
            return false;
        }

        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    }
}
