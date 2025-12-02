/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Optimize for Vercel CDN
  images: {
    formats: ["image/avif", "image/webp"],
    // Enable image optimization
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
  // Enable compression
  compress: true,
  // Enable static page generation where possible
  output: "standalone",
  // Optimize font loading
  experimental: {
    optimizePackageImports: ["@blocknote/core", "@blocknote/mantine", "@mantine/core"],
  },
};

export default config;
