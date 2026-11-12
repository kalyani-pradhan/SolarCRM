<?php

declare(strict_types=1);

final class AuthController
{
    public static function login(): void
    {
        $input = json_decode((string) file_get_contents('php://input'), true);
        $input = is_array($input) ? $input : [];

        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');

        if ($email === '' || $password === '') {
            Response::error('Validation failed.', 422, ['email' => ['Email is required.'], 'password' => ['Password is required.']]);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Validation failed.', 422, ['email' => ['A valid email is required.']]);
        }

        if (strlen($email) > 254 || strlen($password) < 8 || strlen($password) > 256) {
            Response::error('Invalid email or password.', 401);
        }

        $identifier = $email;
        $ipAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        if (RateLimiter::isBlocked($identifier, $ipAddress)) {
            Response::error('Too many login attempts. Please try again later.', 429);
        }

        $database = new Database();
        $pdo = $database->getConnection();
        $stmt = $pdo->prepare('SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        $isValidLogin = $user !== false && password_verify($password, (string) ($user['password_hash'] ?? ''));
        if (!$isValidLogin || !((int) ($user['is_active'] ?? 0) === 1)) {
            RateLimiter::recordFailure($identifier, $ipAddress);
            Response::error('Invalid email or password.', 401);
        }

        RateLimiter::clearFailures($identifier);
        SessionManager::regenerate();

        $_SESSION['user'] = [
            'id' => (int) $user['id'],
            'name' => (string) $user['name'],
            'email' => (string) $user['email'],
            'role' => (string) $user['role'],
            'is_active' => (bool) $user['is_active'],
        ];

        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        $updateStmt = $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = :id');
        $updateStmt->execute([':id' => (int) $user['id']]);

        Response::success([
            'user' => self::sanitizeUser($user),
            'csrf_token' => $_SESSION['csrf_token'],
        ], 'Logged in successfully.');
    }

    public static function me(): void
    {
        AuthMiddleware::requireAuth();

        $database = new Database();
        $pdo = $database->getConnection();
        $userId = (int) ($_SESSION['user']['id'] ?? 0);

        $stmt = $pdo->prepare('SELECT id, name, email, role, is_active FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();

        if ($user === false || !((int) ($user['is_active'] ?? 0) === 1)) {
            Response::error('Authentication required.', 401);
        }

        Response::success([
            'user' => self::sanitizeUser($user),
        ], 'Current user loaded successfully.');
    }

    public static function logout(): void
    {
        AuthMiddleware::requireAuth();
        SessionManager::destroy();
        Response::success([], 'Logged out successfully.');
    }

    public static function csrf(): void
    {
        AuthMiddleware::requireAuth();
        SessionManager::initialize();
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

        Response::success([
            'csrf_token' => $_SESSION['csrf_token'],
        ], 'CSRF token ready.');
    }

    private static function sanitizeUser(array $user): array
    {
        return [
            'id' => (int) ($user['id'] ?? 0),
            'name' => (string) ($user['name'] ?? ''),
            'email' => (string) ($user['email'] ?? ''),
            'role' => (string) ($user['role'] ?? 'telecaller'),
            'is_active' => (bool) (($user['is_active'] ?? 1) === 1),
        ];
    }
}
