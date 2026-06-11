import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    // Turbo configuration if needed
  },
  
  // Supabase requires image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
    ],
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Note: webpack config is ignored when using Turbopack
  // Migrate to turbopack config if needed
};

export default nextConfig;
