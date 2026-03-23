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
      { protocol: "https", hostname: "**.ohpolly.com" },
      { protocol: "https", hostname: "**.houseofcb.com" },
      { protocol: "https", hostname: "**.peppermayo.com" },
      { protocol: "https", hostname: "**.princesspolly.com" },
      { protocol: "https", hostname: "**.princesspolly.com.au" },
      { protocol: "https", hostname: "**.revolve.com" },
      { protocol: "https", hostname: "is4.revolveassets.com" },
      { protocol: "https", hostname: "images.asos-media.com" },
      { protocol: "https", hostname: "**.abercrombie.com" },
      { protocol: "https", hostname: "**.scene7.com" },
      { protocol: "https", hostname: "**.coachoutlet.com" },
      { protocol: "https", hostname: "static.zara.net" },
    ],
    // Enable Next.js image optimization for production
    // unoptimized: true,
  },
};

export default nextConfig;
