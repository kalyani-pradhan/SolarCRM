#!/usr/bin/env php
<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This owner bootstrap command must be run from the CLI only.\n");
    exit(1);
}

require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Database.php';

$config = Config::load();
$databaseConfig = $config['database'] ?? [];
$email = trim((string) (getenv('SOLARCRM_OWNER_EMAIL') ?: ($databaseConfig['owner_email'] ?? '')));
$password = (string) (getenv('SOLARCRM_OWNER_PASSWORD') ?: ($databaseConfig['owner_password'] ?? ''));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Set SOLARCRM_OWNER_EMAIL to a valid owner email before running this bootstrap script.\n");
    exit(1);
}

if (strlen($password) < 10 || strlen($password) > 128) {
    fwrite(STDERR, "Set SOLARCRM_OWNER_PASSWORD to a strong password between 10 and 128 characters.\n");
    exit(1);
}

try {
    $database = new Database();
    $pdo = $database->getConnection();

    $existingOwner = $pdo->query("SELECT id, email FROM users WHERE role = 'owner' ORDER BY id ASC LIMIT 1")->fetch();
    if ($existingOwner !== false && (int) $existingOwner['id'] > 0 && (string) $existingOwner['email'] !== $email) {
        fwrite(STDERR, "An owner account already exists for " . $existingOwner['email'] . ". Refusing to create a second owner.\n");
        exit(1);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    if ($existingOwner === false) {
        $stmt = $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, role, is_active, last_login_at)
             VALUES (:name, :email, :password_hash, :role, 1, NOW())'
        );
        $stmt->execute([
            ':name' => 'Owner',
            ':email' => $email,
            ':password_hash' => $passwordHash,
            ':role' => 'owner',
        ]);
    } else {
        $stmt = $pdo->prepare(
            'UPDATE users
             SET name = :name,
                 email = :email,
                 password_hash = :password_hash,
                 role = :role,
                 is_active = 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = :id'
        );
        $stmt->execute([
            ':name' => 'Owner',
            ':email' => $email,
            ':password_hash' => $passwordHash,
            ':role' => 'owner',
            ':id' => (int) $existingOwner['id'],
        ]);
    }

    echo "Owner bootstrap complete for {$email}\n";
} catch (Throwable $exception) {
    fwrite(STDERR, 'Owner bootstrap failed: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
