# SolarCRM Deployment Guide

## Hosting model

This project is built so the React frontend can remain in place while the PHP API is deployed separately to a PHP-enabled shared host.

## Recommended deployment order

1. Create a blank MySQL database in phpMyAdmin.
2. Import the file `backend/database/install.sql`.
3. Copy the backend folder to the host.
4. Copy the production frontend build to a static hosting area or serve it through the host if required.
5. Configure `backend/config/config.php` or environment variables.
6. Create the first owner account.
7. Verify login and health endpoints.

## Configure backend connection

Use `backend/config/config.example.php` as the template and set the correct values for your host database.

```php
return [
    'database' => [
        'host' => 'localhost',
        'port' => 3306,
        'dbname' => 'solarcrm',
        'username' => 'your_db_user',
        'password' => 'your_db_password',
        'charset' => 'utf8mb4',
    ],
];
```

Do not commit real credentials to the repository.

## Create the first owner

Use the CLI-only bootstrap script as the authoritative procedure. Do not run the owner creation logic from the web app or a browser endpoint.

```bash
export SOLARCRM_OWNER_EMAIL="owner@yourdomain.com"
export SOLARCRM_OWNER_PASSWORD="StrongPassword123!"
php backend/bin/create-owner.php
```

This script is the supported creation path and refuses to create a second owner account if one already exists.

Then log in through the API auth endpoint using that email and password.

## Security checklist

- Ensure the API is served behind HTTPS.
- Restrict direct database access to the database user only.
- Use a strong owner password.
- Keep the frontend and API on trusted domains only.
- Review CORS and session settings before going live.

## Troubleshooting

- If `/api/health` fails, confirm PHP and PDO MySQL are enabled on the host.
- If the database connection fails, verify the database name, username, and host values.
- If login fails, ensure the first owner record exists and the password is correct.
