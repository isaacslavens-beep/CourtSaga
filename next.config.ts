import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  images: {
    // 90 is used for the hero photos
    qualities: [75, 90],
  },
  partialPrefetching: true,
  // The ranking was replaced by exploring a match, and
  async redirects() {
    // Logging became starring
    return [
      { source: "/rank", destination: "/explore", permanent: true },
      // …then starring moved into Explore, which is home
      { source: "/log", destination: "/explore", permanent: true },
      { source: "/star", destination: "/explore", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
