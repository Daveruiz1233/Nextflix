import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
  // In a static export, headers() are ignored. 
  // We move CSP to a <meta> tag in layout.tsx for Capacitor support.
};

export default nextConfig;
