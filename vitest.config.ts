import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Integration tests share one PostgreSQL database, so they must not run in
    // parallel — concurrent truncation between files would corrupt fixtures.
    fileParallelism: false,
    // ...and they must share ONE worker. With a worker per file, a finished
    // file's connection stays idle holding AccessShareLock, which deadlocks the
    // next file's TRUNCATE. One worker means one connection pool, no deadlock.
    maxWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
