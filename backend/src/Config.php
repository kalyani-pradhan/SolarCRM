<?php

declare(strict_types=1);

final class Config
{
    /**
     * @return array<string, mixed>
     */
    public static function load(): array
    {
        $configPath = __DIR__ . '/../config/config.php';
        if (file_exists($configPath)) {
            $config = require $configPath;
            return is_array($config) ? $config : [];
        }

        return require __DIR__ . '/../config/database.php';
    }
}
