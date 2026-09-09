import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [48, 96, 160, 240, 320, 480],
  },
  typedRoutes: false,
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
