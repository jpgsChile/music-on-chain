Archived SQLite migration `20260923180000_fan_economy`.

That SQL uses SQLite types (`DATETIME`, inline `PRIMARY KEY`) and only covered Fan Economy tables. It is not a PostgreSQL migration and must not be applied to production.

The local file `prisma/dev.db` is unchanged. Production starts from `prisma/migrations/20260927180000_init_postgresql`.
