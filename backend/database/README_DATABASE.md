# SolarCRM Database Installation

This project is designed for a shared-hosting deployment model. The database is created in phpMyAdmin on the hosting server, then the PHP API is uploaded and configured to connect to that database.

## 1) Create a blank MySQL database

In phpMyAdmin:

1. Open the hosting MySQL database manager.
2. Create a new empty database, for example `solarcrm`.
3. Select the new database.
4. Import the file `backend/database/install.sql`.

Do not import the file into a database that already contains live tables unless you intentionally want to reset it.

## 2) Required database settings

The backend uses the values from `backend/config/config.php` or the environment variables shown in `.env.example`.

Set the following host values for your server:

- host
- port
- dbname
- username
- password

Use the actual credentials provided by the hosting provider. Do not hard-code secrets into the SQL file.

## 3) Create the initial owner account

After the schema is in place, run the secure bootstrap script from the project root:

```bash
php backend/bin/create-owner.php
```

Set the runtime variables first:

```bash
export SOLARCRM_OWNER_EMAIL="owner@yourdomain.com"
export SOLARCRM_OWNER_PASSWORD="StrongPassword123!"
php backend/bin/create-owner.php
```

This creates the first `owner` user with a hashed password without exposing the password in source control or the SQL script.

## 4) Verify the database layer

Once the backend is published, test the API endpoint:

```bash
curl http://your-domain.example.com/api/health
```

Expect a JSON status response confirming the API is healthy.

## 5) If tables already exist

If the target database is not empty, either:

- drop the existing SolarCRM tables intentionally, or
- run the schema in a fresh test database first

The install script uses `CREATE TABLE IF NOT EXISTS`, so it is safe to rerun only when the destination database is already empty or intentionally matches the current schema.
