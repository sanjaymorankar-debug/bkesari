#!/bin/sh
# Regenerates database/schema.sql — a plain-SQL copy of the PostgreSQL schema —
# with `pg_dump --schema-only` of a scratch database that has had every drizzle
# migration applied. Nothing in the output is hand-written.
#
# Run this after `npm run db:generate` whenever src/server/db/schema.ts changes,
# so the artifact never drifts from the migrations it is derived from.
#
# Needs: psql and pg_dump (same major version as the server, or newer), and a
# role that may CREATE DATABASE. Point ADMIN_DATABASE_URL at any database on
# that server; a scratch database is created next to it and dropped afterwards.
#
#   ADMIN_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
#     scripts/dump-schema.sh
set -eu
cd "$(dirname "$0")/.."

: "${ADMIN_DATABASE_URL:?set ADMIN_DATABASE_URL to a postgresql:// URL whose role may CREATE DATABASE}"

SCRATCH_DB="bkesari_schema_dump_$$"
SCRATCH_URL=$(node -e '
  const u = new URL(process.argv[1]);
  u.pathname = "/" + process.argv[2];
  console.log(u.toString());
' "$ADMIN_DATABASE_URL" "$SCRATCH_DB")

cleanup() {
  psql "$ADMIN_DATABASE_URL" -q -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS \"$SCRATCH_DB\"" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

psql "$ADMIN_DATABASE_URL" -q -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$SCRATCH_DB\""

# The migrator validates the whole app environment, so the two required secrets
# get throwaway values; nothing else reads them here.
DATABASE_URL="$SCRATCH_URL" AUTH_SECRET=schema-dump CRON_SECRET=schema-dump \
  npm run --silent db:migrate >/dev/null

{
  cat <<'HEADER'
-- Milk & Dairy Products — PostgreSQL schema for one environment's database.
--
-- GENERATED, do not hand-edit: `pg_dump --schema-only` of a database with every
-- migration in drizzle/ applied; those are themselves generated from
-- src/server/db/schema.ts by `npm run db:generate`. Regenerate with
-- scripts/dump-schema.sh. Change the schema in schema.ts.
--
-- Prefer `npm run db:migrate`, which applies the same schema AND records it in
-- drizzle.__drizzle_migrations so later migrations apply on top. A database
-- built from this file instead is not tracked by the migrator: running
-- `db:migrate` against it afterwards will try to create everything again.
-- Use this file to review the schema, or to bootstrap a database where the
-- migrator cannot be run:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
--
-- Requires PostgreSQL 13 or newer (gen_random_uuid() is built in from 13).
HEADER
  echo ""
  # Only the application's own schema: the migrator's bookkeeping lives in the
  # separate `drizzle` schema and is deliberately left out. pg_dump's
  # \restrict / \unrestrict lines are psql-only meta-commands carrying a random
  # key, so they are dropped to keep the file stable and runnable in any client.
  pg_dump --schema-only --no-owner --no-privileges --exclude-schema=drizzle "$SCRATCH_URL" \
    | sed -e '/^\\restrict /d' -e '/^\\unrestrict /d'
} > database/schema.sql

echo "database/schema.sql regenerated from drizzle/ via pg_dump"
