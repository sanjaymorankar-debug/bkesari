/**
 * Test bootstrap.
 *
 * Points the application's database singleton at the dedicated test database
 * BEFORE any application module is imported, so integration tests exercise real
 * SQL — constraints, locks and all — without touching development data.
 */
import "dotenv/config";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error(
    "TEST_DATABASE_URL must be set. Integration tests run against real PostgreSQL.",
  );
}

// NODE_ENV is typed readonly by @types/node; assign through the record form.
const env = process.env as Record<string, string | undefined>;
env.DATABASE_URL = testUrl;
env.NODE_ENV = "test";
env.AUTH_SECRET ??= "test-secret";
env.CRON_SECRET ??= "test-cron-secret";
env.CASHFREE_SECRET_KEY ??= "test-webhook-secret";
// Fake key so isGeocodingConfigured() is true — tests that exercise the
// verify-location path stub global.fetch, so this never makes a real call.
env.GOOGLE_MAPS_SERVER_API_KEY ??= "test-google-maps-key";
