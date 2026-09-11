import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  /** Self-contained server bundle for Docker deployments (see Dockerfile). */
  output: "standalone",
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
  typedRoutes: false,
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
