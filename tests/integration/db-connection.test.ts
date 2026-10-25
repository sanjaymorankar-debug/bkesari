/**
 * The app's connection pool survives the server closing its connections.
 *
 * Neon suspends an idle compute and drops every connection to it; a pooler
 * restart or an operator's pg_terminate_backend does the same. node-postgres
 * reports the death of an idle client as an `error` event on the pool, and an
 * `error` event nobody listens for is an uncaught exception: the whole app
 * process exits. So the pool must carry a listener, and the next query must
 * simply open a new connection.
 */
import { sql } from "drizzle-orm";
import pg from "pg";
import { describe, expect, it } from "vitest";

import { db } from "@/server/db";
import { pgConnectionOptions } from "@/server/db/ssl";

describe("connection pool", () => {
  it("listens for errors from idle connections", () => {
    expect(db.$client.listenerCount("error")).toBeGreaterThan(0);
  });

  it("answers the next query after the server terminates its idle connections", async () => {
    // Open a connection and leave it idle in the pool.
    const before = await db.execute<{ pid: number }>(sql`SELECT pg_backend_pid() AS pid`);
    expect(before.rows[0].pid).toBeGreaterThan(0);
    expect(db.$client.idleCount).toBeGreaterThan(0);

    // Terminate every other session this role holds on this database, from a
    // connection of its own — exactly what a compute suspend looks like.
    const admin = new pg.Client(pgConnectionOptions(process.env.DATABASE_URL!));
    await admin.connect();
    try {
      await admin.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
          WHERE usename = current_user AND datname = current_database()
            AND pid <> pg_backend_pid()`,
      );
    } finally {
      await admin.end();
    }

    // Give the pool a moment to notice the closed sockets.
    await new Promise((resolve) => setTimeout(resolve, 200));

    const after = await db.execute<{ ok: number }>(sql`SELECT 1 AS ok`);
    expect(after.rows[0].ok).toBe(1);
  });

  it("fails a transaction cleanly when the server drops its connection mid-way", async () => {
    // Every wallet, checkout and subscription write is a db.transaction(): one
    // client checked out of the pool for BEGIN … COMMIT. While it is checked
    // out the pool does not listen for that client's errors, so a connection
    // dropped between two statements must be caught by a listener of the
    // app's own, or the process dies of an unhandled 'error' event.
    const attempt = db.transaction(async (tx) => {
      const own = await tx.execute<{ pid: number }>(sql`SELECT pg_backend_pid() AS pid`);

      const admin = new pg.Client(pgConnectionOptions(process.env.DATABASE_URL!));
      await admin.connect();
      try {
        await admin.query("SELECT pg_terminate_backend($1)", [own.rows[0].pid]);
      } finally {
        await admin.end();
      }
      // The termination reaches this client while it sits idle in the
      // transaction, between two statements.
      await new Promise((resolve) => setTimeout(resolve, 300));

      await tx.execute(sql`SELECT 1`);
    });

    await expect(attempt).rejects.toThrow();

    const after = await db.execute<{ ok: number }>(sql`SELECT 1 AS ok`);
    expect(after.rows[0].ok).toBe(1);
  });
});
