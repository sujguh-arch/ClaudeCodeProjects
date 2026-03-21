import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: ".",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "**.replicate.delivery" },
      { protocol: "https", hostname: "**.wolford.com" },
      { protocol: "https", hostname: "**.nordstrom.com" },
      { protocol: "https", hostname: "**.farfetch.com" },
      { protocol: "https", hostname: "**.mytheresa.com" },
      { protocol: "https", hostname: "**.ssense.com" },
      { protocol: "https", hostname: "**.net-a-porter.com" },
      { protocol: "https", hostname: "**.asos.com" },
      { protocol: "https", hostname: "**.zara.com" },
    ],
    // Enable Next.js image optimization for production
    // unoptimized: true,
  },
};

export default nextConfig;
