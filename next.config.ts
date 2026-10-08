import type { NextConfig } from "next";

/**
 * The path prefix this app is served under.
 *
 * On bkesari.com the hub forwards `/milk/` to this app and does NOT strip the
 * prefix, so the app has to own it: `basePath` is what makes Next emit
 * `/milk/_next/...` for its assets and `/milk/orders` for its links. Without
 * it every asset URL would point at the hub's root, where nothing serves them,
 * and the page would load as unstyled HTML with no working navigation.
 *
 * BASE_PATH HAS TO BE SET IN TWO PLACES, and both are easy to miss:
 *
 *   1. At BUILD time, because Next inlines the value into the client bundles
 *      ("must be set at build time and cannot be changed without re-building",
 *      per Next's own basePath documentation). The deploy workflow's build step
 *      sets it.
 *   2. At RUNTIME, because `next start` evaluates this file again to decide how
 *      to route. Set it in the server's .env. Verified the hard way: a build
 *      made with BASE_PATH=/milk but started without it serves the app at `/`
 *      while every asset URL in the HTML points at `/milk/_next/...`, so every
 *      page loads as unstyled markup.
 *
 * Empty by default, which leaves `npm run dev` and any direct visit to the
 * app's own hostname working exactly as before.
 *
 * One thing to watch if images are ever added: `next/image` does NOT prefix a
 * local `src`, so those have to carry the prefix themselves. Nothing in this
 * app uses next/image today.
 */
function readBasePath(): string {
  const raw = (process.env.BASE_PATH ?? "").trim();
  if (!raw) return "";

  if (!raw.startsWith("/")) {
    throw new Error(`BASE_PATH must start with "/" (got ${JSON.stringify(raw)})`);
  }
  if (raw === "/") {
    throw new Error('BASE_PATH must not be "/" — leave it unset to serve from the root');
  }
  if (raw.endsWith("/")) {
    throw new Error(`BASE_PATH must not end with "/" (got ${JSON.stringify(raw)})`);
  }
  if (!/^(\/[A-Za-z0-9._~-]+)+$/.test(raw)) {
    throw new Error(`BASE_PATH is not a plain URL path (got ${JSON.stringify(raw)})`);
  }
  return raw;
}

const basePath = readBasePath();

/**
 * BASE_URL is the absolute origin-and-path used for links in mail and payment
 * callbacks, where no request is in scope. It therefore has to agree with
 * `basePath`, and the two are set in different places — this is the one
 * mismatch that produces links which 404 for customers while every page on the
 * site looks fine. Reported here rather than left to be discovered.
 */
if (basePath && process.env.BASE_URL) {
  try {
    const configured = new URL(process.env.BASE_URL).pathname.replace(/\/$/, "");
    if (configured !== basePath) {
      console.warn(
        `[next.config] BASE_PATH is ${JSON.stringify(basePath)} but BASE_URL's path is `
          + `${JSON.stringify(configured || "/")}. Absolute links in mail and payment `
          + `callbacks will not match the path this build is served under.`,
      );
    }
  } catch {
    console.warn(`[next.config] BASE_URL is not a valid URL: ${process.env.BASE_URL}`);
  }
}

const nextConfig: NextConfig = {
  // Both omitted when empty, so the config is identical to before for anyone
  // serving this app from the root of its own hostname.
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
