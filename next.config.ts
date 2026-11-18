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
  // The books each build works out (scripts/books.ts), read from disk at runtime
  outputFileTracingIncludes: { "/**": ["./assets/books/**"] },
  // The site's earlier pages, wherever they went
  async redirects() {
    return [
      // Explore became Tournaments, and its match pages moved to Matches: /explore?m=<id> is /matches/<id>
      { source: "/explore", has: [{ type: "query", key: "m", value: "(?<m>.+)" }], destination: "/matches/:m", permanent: true },
      { source: "/explore", destination: "/tournaments", permanent: false },
      // Ranking, logging and starring pages, long gone: starring happens on a match's page
      { source: "/rank", destination: "/tournaments", permanent: true },
      { source: "/log", destination: "/tournaments", permanent: true },
      { source: "/star", destination: "/tournaments", permanent: true },
      // Interact was renamed Advanced, which is now part of Statistics (see app/(app)/advanced)
      { source: "/interact", destination: "/advanced", permanent: true },
      { source: "/interact/women", destination: "/advanced/women", permanent: true },
      // The quiz is gone for now
      { source: "/quiz", destination: "/", permanent: false },
      { source: "/quiz/:path*", destination: "/", permanent: false },
      // The account page went: who's signed in, and logging out, are at the foot of every page
      { source: "/account", destination: "/", permanent: false },
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
