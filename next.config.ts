import type { NextConfig } from "next";

/**
 * Deliberately only the directives that cannot break rendering: no script-src/style-src/
 * connect-src yet (Stripe.js, PayPal, analytics and next/image need a tested allowlist first –
 * see docs/SECURITY.md). `form-action 'self'` is enough: every `<form>` posts to this origin,
 * PayPal and Stripe Checkout are reached by a script navigation, not by a form.
 */
const contentSecurityPolicy = [
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const staticAssetCacheControl = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  /**
   * Self-contained server bundle, needed only by the Docker image (see Dockerfile),
   * which starts it with `node server.js`. It is opt-in because `next start` refuses
   * to serve a standalone build, which breaks the CI test server and every host that
   * builds the app itself.
   */
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [48, 96, 160, 240, 320, 480],
    qualities: [75, 82],
    remotePatterns: process.env.UPLOADS_PUBLIC_HOST
      ? [{ protocol: "https", hostname: process.env.UPLOADS_PUBLIC_HOST }]
      : [],
  },
  serverExternalPackages: ["postgres", "sharp"],
  experimental: {
    // Turbopack's persistent build cache stores a copy of the whole build environment,
    // secrets included (e.g. SMTP_PASS). Netlify's secret scan then fails the deploy, and
    // the free plan cannot limit a secret to runtime only. Without this cache no secret is
    // written to disk during the build; builds are slightly slower.
    turbopackFileSystemCacheForBuild: false,
  },
  typedRoutes: false,
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    /**
     * Read by src/lib/rate-limit.ts. `NETLIFY=true` only exists during the build on Netlify,
     * so the fact is baked into the bundle here: only there may `x-nf-client-connection-ip`
     * be trusted as the client address (elsewhere a client could simply send that header).
     */
    BUILD_TRUSTED_IP_HEADER: process.env.NETLIFY === "true" ? "x-nf-client-connection-ip" : "",
    /**
     * Read by src/lib/uploads.ts for the same reason: on Netlify the filesystem is read-only,
     * so uploads (admin images, review photos) go to Netlify Blobs unless S3 is configured.
     */
    BUILD_ON_NETLIFY: process.env.NETLIFY === "true" ? "1" : "",
  },
  // The shop moved from bloomery.at to blumora.at. Pages redirect permanently; /api stays
  // reachable on the old host so webhooks registered with the old URL keep working.
  async redirects() {
    const oldHost = [{ type: "host" as const, value: "(?:www\\.)?bloomery\\.at" }];
    return [
      { source: "/", has: oldHost, destination: "https://blumora.at/", permanent: true },
      { source: "/:path((?!api/).+)", has: oldHost, destination: "https://blumora.at/:path", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Files in /public keep their name when their content changes, so no `immutable`:
      // one day fresh, then served stale for up to a week while the browser revalidates.
      ...["/images/:path*", "/videos/:path*"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: staticAssetCacheControl }],
      })),
    ];
  },
};

export default nextConfig;
