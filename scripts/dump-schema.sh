#!/bin/sh
# Regenerates database/schema.sql (a plain, psql-runnable copy of the whole
# PostgreSQL schema) from the drizzle migrations.
#
# It creates a throwaway database, applies every migration in drizzle/ in order,
# dumps the result with `pg_dump --schema-only`, and drops the database again.
# Dumping a real database (rather than concatenating migration files) means the
# artifact is always the cumulative schema, however many migrations exist.
#
# Run this after `npm run db:generate` whenever src/server/db/schema.ts changes,
# so the artifact never drifts from the migrations it is derived from.
#
# Needs psql and pg_dump on PATH (pg_dump's major version must be >= the
# server's), and a role that may CREATE DATABASE. Configure with:
#   PG_ADMIN_URL      maintenance connection, default
#                     postgresql://postgres:postgres@127.0.0.1:5432/postgres
#   SCHEMA_DUMP_DB    throwaway database name, default bkesari_schema_dump_<pid>
set -eu
cd "$(dirname "$0")/.."

ADMIN_URL=${PG_ADMIN_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}
DUMP_DB=${SCHEMA_DUMP_DB:-bkesari_schema_dump_$$}

ls drizzle/[0-9]*.sql >/dev/null 2>&1 || {
  echo "no migrations in drizzle/ — run npm run db:generate first" >&2
  exit 1
}

# Same server and credentials as the admin URL, different database.
DUMP_URL=$(node -e '
  const u = new URL(process.argv[1]);
  u.pathname = "/" + process.argv[2];
  console.log(u.toString());
' "$ADMIN_URL" "$DUMP_DB")

psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "CREATE DATABASE \"$DUMP_DB\""
trap 'psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS \"$DUMP_DB\"" >/dev/null 2>&1 || true' EXIT

# drizzle separates statements with a marker its own migrator understands; a
# plain SQL client does not, so it is stripped. File names are zero-padded, so
# a lexical sort is the order the migrator applies them in.
for migration in $(ls drizzle/[0-9]*.sql | sort); do
  sed 's|--> statement-breakpoint||' "$migration" |
    psql "$DUMP_URL" -v ON_ERROR_STOP=1 -q -f - >/dev/null
done

{
  cat <<'HEADER'
-- Milk & Dairy Products — PostgreSQL schema for one environment's database.
--
-- GENERATED, do not hand-edit: produced by scripts/dump-schema.sh, which applies
-- every migration in drizzle/ to a scratch database and dumps it with pg_dump.
-- The migrations are generated from src/server/db/schema.ts by
-- `npm run db:generate`. Change the schema in schema.ts, never here.
--
-- Two ways to apply it, to an EMPTY database (PostgreSQL 14 or newer):
--   * npm run db:migrate   (preferred — also records the migration, so later
--                           migrations apply on top of it)
--   * psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
--     (or paste it into your provider's SQL editor). This does NOT record the
--     migration: do not run `npm run db:migrate` against the same database
--     afterwards, or it will try to create everything again.
HEADER
  echo ""
  # Drop pg_dump's version banner and its psql-only \restrict guard lines, so
  # the file is stable across pg_dump versions and runnable in any SQL client.
  pg_dump "$DUMP_URL" --schema-only --no-owner --no-privileges |
    grep -v -e '^\\restrict ' -e '^\\unrestrict ' -e '^-- Dumped from database version' -e '^-- Dumped by pg_dump version' |
    cat -s
} > database/schema.sql

echo "database/schema.sql regenerated from $(ls drizzle/[0-9]*.sql | wc -l | tr -d ' ') migration(s)"
