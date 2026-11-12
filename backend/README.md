# SolarCRM PHP Backend

This folder contains the initial PHP + MySQL backend skeleton for the existing SolarCRM React app.

## Requirements

- PHP 8.2+
- MySQL 8 or MariaDB 10.6+
- PDO MySQL extension enabled
- `php` CLI and `php-cgi`/Apache or Nginx to serve the public directory

## Local development

1. Copy the example configuration:

   ```bash
   cp backend/config/config.example.php backend/config/config.php
   ```

2. Update the database credentials in `backend/config/config.php`.
3. Create the MySQL database and user:

   ```sql
   CREATE DATABASE solarcrm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'solarcrm'@'127.0.0.1' IDENTIFIED BY 'change_me';
   GRANT ALL PRIVILEGES ON solarcrm.* TO 'solarcrm'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```

4. Run migrations:

   ```bash
   mysql -u solarcrm -p solarcrm < backend/database/schema.sql
   ```

5. Start the local API server:

   ```bash
   php -S 127.0.0.1:8080 -t backend/public
   ```

6. Verify the health endpoint:

   ```bash
   curl http://127.0.0.1:8080/api/health
   ```

## Security notes

- Keep `backend/config/config.php` out of version control.
- Do not expose database credentials or session details in responses.
- Use secure cookies in production and enable HTTPS.
- Keep CORS restricted to known frontend origins only.

## Current milestone status

Milestone 1 is complete for the architecture audit, schema design, migration files, and the API health endpoint.

Milestone 2 adds a secure session-based authentication flow with login/logout/me endpoints, CSRF token support, owner bootstrap, and login rate limiting. The frontend remains unchanged and continues to use the existing localStorage model until the backend is integrated in later milestones.

## Authoritative owner bootstrap

The supported procedure is the CLI script at `backend/bin/create-owner.php`. The proxy script `backend/bin/bootstrap-owner.php` exists only as a compatibility wrapper and should not be treated as a separate implementation.
