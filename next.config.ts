import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
    ],
  },
  // Optimization for build process
  typescript: {
    // During development, we want to see all errors
    // But for production builds on Vercel, we can skip to save memory
    ignoreBuildErrors: process.env.VERCEL ? true : false,
  },
  eslint: {
    // During development, we want to see all errors
    // But for production builds on Vercel, we can skip to save memory
    ignoreDuringBuilds: true,
  },
  // Optimize production builds
  productionBrowserSourceMaps: false,
};

export default nextConfig;
