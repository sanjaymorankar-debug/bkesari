#!/bin/sh
# Regenerates database/schema.sql (the phpMyAdmin-runnable copy of the schema)
# from the drizzle migration baseline.
#
# Run this after `npm run db:generate` whenever src/server/db/schema.ts changes,
# so the artifact never drifts from the migration it is derived from.
set -eu
cd "$(dirname "$0")/.."

BASELINE=drizzle/0000_mysql_baseline.sql
[ -f "$BASELINE" ] || { echo "missing $BASELINE — run npm run db:generate first" >&2; exit 1; }

{
  cat <<'HEADER'
-- Milk & Dairy Products — MySQL schema for one environment's database.
--
-- GENERATED, do not hand-edit: produced from drizzle/0000_mysql_baseline.sql,
-- which is itself generated from src/server/db/schema.ts by `npm run db:generate`.
-- Regenerate with scripts/dump-schema.sh. Change the schema in schema.ts.
--
-- Two ways to apply it:
--   * SSH:        npm run db:migrate   (preferred — records the migration)
--   * phpMyAdmin: select the database, Import, choose this file
--
-- Create the database and user in hPanel first (Databases > MySQL Databases);
-- phpMyAdmin cannot create them. Names are case-sensitive on Linux.
-- dev: u879099820_main_milk_dev
HEADER
  echo ""
  # drizzle separates statements with a marker its own migrator understands;
  # a plain SQL client does not, so it is stripped.
  sed 's|--> statement-breakpoint||' "$BASELINE"
} > database/schema.sql

echo "database/schema.sql regenerated from $BASELINE"
